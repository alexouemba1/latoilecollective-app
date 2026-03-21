import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY manquante.");
    }

    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL manquante.");
    }

    if (!supabaseServiceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante.");
    }

    let body: { artistId?: number | string; refreshUrl?: string; returnUrl?: string } = {};

    try {
      const contentType = req.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        body = await req.json();
      }
    } catch {
      throw new Error("Le body JSON est invalide.");
    }

    const artistId = Number(body?.artistId);
    const refreshUrl = body?.refreshUrl || "http://localhost:5173/seller-dashboard";
    const returnUrl = body?.returnUrl || "http://localhost:5173/seller-dashboard";

    if (!artistId || Number.isNaN(artistId)) {
      throw new Error("artistId invalide ou manquant.");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id, userId, stripeAccountId, stripeOnboardingComplete")
      .eq("id", artistId)
      .maybeSingle();

    if (artistError) {
      throw new Error(`Erreur lecture artiste: ${artistError.message}`);
    }

    if (!artist) {
      throw new Error("Artiste introuvable.");
    }

    let stripeAccountId = artist.stripeAccountId ?? null;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
      });

      stripeAccountId = account.id;

      const { error: updateError } = await supabase
        .from("artists")
        .update({
          stripeAccountId,
          stripeOnboardingComplete: false,
        })
        .eq("id", artistId);

      if (updateError) {
        throw new Error(`Erreur mise à jour artiste: ${updateError.message}`);
      }
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);

    const onboardingComplete =
      Boolean(account.details_submitted) &&
      Boolean(account.charges_enabled) &&
      Boolean(account.payouts_enabled);

    if (onboardingComplete !== Boolean(artist.stripeOnboardingComplete)) {
      const { error: syncError } = await supabase
        .from("artists")
        .update({
          stripeOnboardingComplete: onboardingComplete,
        })
        .eq("id", artistId);

      if (syncError) {
        throw new Error(`Erreur synchronisation Stripe: ${syncError.message}`);
      }
    }

    if (onboardingComplete) {
      return new Response(
        JSON.stringify({
          url: returnUrl,
          stripeAccountId,
          stripeOnboardingComplete: true,
          alreadyComplete: true,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        stripeAccountId,
        stripeOnboardingComplete: false,
        alreadyComplete: false,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("connect-stripe error:", error);

    const message = error instanceof Error ? error.message : "Erreur inconnue";

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});