import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROD_SITE_URL = "https://latoilecolective.com";
const PROD_DASHBOARD_URL = `${PROD_SITE_URL}/seller-dashboard`;

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée." }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    console.log("CONNECT_STRIPE_HARDCODED_HTTPS_V2");
    console.log("connect-stripe urls", {
      refreshUrl: PROD_DASHBOARD_URL,
      returnUrl: PROD_DASHBOARD_URL,
    });

    const stripeSecretKey = safeString(Deno.env.get("STRIPE_SECRET_KEY"));
    const supabaseUrl = safeString(Deno.env.get("SUPABASE_URL"));
    const supabaseServiceRoleKey = safeString(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

    if (!stripeSecretKey) {
      throw new HttpError(500, "STRIPE_SECRET_KEY manquante.");
    }

    if (!supabaseUrl) {
      throw new HttpError(500, "SUPABASE_URL manquante.");
    }

    if (!supabaseServiceRoleKey) {
      throw new HttpError(500, "SUPABASE_SERVICE_ROLE_KEY manquante.");
    }

    let body: { artistId?: number | string } = {};

    try {
      const contentType = req.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        body = await req.json();
      }
    } catch {
      throw new HttpError(400, "Le body JSON est invalide.");
    }

    const artistId = Number(body?.artistId);

    if (!artistId || Number.isNaN(artistId)) {
      throw new HttpError(400, "artistId invalide ou manquant.");
    }

    const refreshUrl = PROD_DASHBOARD_URL;
    const returnUrl = PROD_DASHBOARD_URL;

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      throw new HttpError(401, "Utilisateur non authentifié.");
    }

    const { data: authUserData, error: authUserError } = await supabase.auth.getUser(token);

    if (authUserError || !authUserData.user) {
      throw new HttpError(401, "Utilisateur non authentifié.");
    }

    const authUser = authUserData.user;

    const { data: appUser, error: appUserError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", authUser.email ?? "")
      .maybeSingle();

    if (appUserError) {
      throw new HttpError(500, `Erreur lecture utilisateur: ${appUserError.message}`);
    }

    if (!appUser) {
      throw new HttpError(404, "Profil utilisateur introuvable.");
    }

    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id, userId, stripeAccountId, stripeOnboardingComplete")
      .eq("id", artistId)
      .maybeSingle();

    if (artistError) {
      throw new HttpError(500, `Erreur lecture artiste: ${artistError.message}`);
    }

    if (!artist) {
      throw new HttpError(404, "Artiste introuvable.");
    }

    if (Number(artist.userId) !== Number(appUser.id)) {
      throw new HttpError(403, "Vous n'êtes pas autorisé à gérer ce compte artiste.");
    }

    let stripeAccountId = safeString(artist.stripeAccountId);

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
        throw new HttpError(500, `Erreur mise à jour artiste: ${updateError.message}`);
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
        throw new HttpError(500, `Erreur synchronisation Stripe: ${syncError.message}`);
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

    if (error instanceof Stripe.errors.StripeError) {
      return new Response(
        JSON.stringify({
          error: error.message || "Erreur Stripe inconnue",
        }),
        {
          status: typeof error.statusCode === "number" ? error.statusCode : 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (error instanceof HttpError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: error.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erreur inconnue",
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