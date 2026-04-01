import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = "https://latoilecolective.com";

type ShippingMethod = "standard" | "express" | "pickup";

type ArtistShippingSettings = {
  shippingStandardEnabled: boolean;
  shippingExpressEnabled: boolean;
  shippingPickupEnabled: boolean;
  shippingStandardPriceCents: number;
  shippingExpressPriceCents: number;
  freeShippingThresholdCents: number;
  shippingCountries: string;
  shippingProcessingDays: number;
  pickupInstructions: string;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const PLATFORM_COMMISSION_RATE = 0.12; // 12%
const PLATFORM_COMMISSION_MINIMUM_CENTS = 150; // 1,50 €

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function euroToCents(value: unknown): number {
  return Math.max(0, Math.round(safeNumber(value) * 100));
}

function normalizeShippingMethod(value: unknown): ShippingMethod {
  const method = safeString(value).toLowerCase();

  if (method === "express") return "express";
  if (method === "pickup") return "pickup";
  return "standard";
}

function buildArtistShippingSettings(artist: Record<string, unknown>): ArtistShippingSettings {
  return {
    shippingStandardEnabled: Boolean(artist.shippingStandardEnabled ?? true),
    shippingExpressEnabled: Boolean(artist.shippingExpressEnabled ?? true),
    shippingPickupEnabled: Boolean(artist.shippingPickupEnabled ?? false),
    shippingStandardPriceCents: euroToCents(artist.shippingStandardPrice ?? 7.9),
    shippingExpressPriceCents: euroToCents(artist.shippingExpressPrice ?? 14.9),
    freeShippingThresholdCents: euroToCents(artist.freeShippingThreshold ?? 200),
    shippingCountries: safeString(artist.shippingCountries) || "France",
    shippingProcessingDays: Math.max(
      0,
      Math.round(safeNumber(artist.shippingProcessingDays ?? 3))
    ),
    pickupInstructions: safeString(artist.pickupInstructions),
  };
}

function getShippingConfig(params: {
  method: ShippingMethod;
  subtotalCents: number;
  settings: ArtistShippingSettings;
}) {
  const { method, subtotalCents, settings } = params;

  if (method === "pickup") {
    if (!settings.shippingPickupEnabled) {
      throw new HttpError(400, "Le retrait sur place n'est pas disponible pour cet artiste.");
    }

    return {
      shippingMethod: "pickup" as ShippingMethod,
      shippingLabel: "Retrait sur place",
      shippingCostCents: 0,
      isFreeShipping: true,
    };
  }

  if (method === "express") {
    if (!settings.shippingExpressEnabled) {
      throw new HttpError(400, "La livraison express n'est pas disponible pour cet artiste.");
    }

    return {
      shippingMethod: "express" as ShippingMethod,
      shippingLabel: "Livraison express",
      shippingCostCents: settings.shippingExpressPriceCents,
      isFreeShipping: false,
    };
  }

  if (!settings.shippingStandardEnabled) {
    throw new HttpError(400, "La livraison standard n'est pas disponible pour cet artiste.");
  }

  const isFreeShipping =
    settings.freeShippingThresholdCents > 0 &&
    subtotalCents >= settings.freeShippingThresholdCents;

  return {
    shippingMethod: "standard" as ShippingMethod,
    shippingLabel: isFreeShipping
      ? "Livraison standard offerte"
      : "Livraison standard",
    shippingCostCents: isFreeShipping ? 0 : settings.shippingStandardPriceCents,
    isFreeShipping,
  };
}

function computePlatformFeeCents(totalAmountCents: number): number {
  const percentageFee = Math.round(totalAmountCents * PLATFORM_COMMISSION_RATE);
  const protectedFee = Math.max(percentageFee, PLATFORM_COMMISSION_MINIMUM_CENTS);

  return Math.max(0, Math.min(protectedFee, totalAmountCents));
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
    console.log("CREATE_CHECKOUT_SESSION_VERSION_FINAL_V1");

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey) throw new HttpError(500, "STRIPE_SECRET_KEY manquante.");
    if (!supabaseUrl) throw new HttpError(500, "SUPABASE_URL manquante.");
    if (!supabaseServiceRoleKey) throw new HttpError(500, "SUPABASE_SERVICE_ROLE_KEY manquante.");

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
      throw new HttpError(500, `Erreur utilisateur: ${appUserError.message}`);
    }

    if (!appUser) {
      throw new HttpError(404, "Profil utilisateur introuvable.");
    }

    let body: {
      successUrl?: string;
      cancelUrl?: string;
      shippingName?: string;
      shippingAddressLine1?: string;
      shippingAddressLine2?: string;
      shippingPostalCode?: string;
      shippingCity?: string;
      shippingCountry?: string;
      shippingEmail?: string;
      shippingPhone?: string;
      shippingMethod?: string;
    } = {};

    try {
      const contentType = req.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        body = await req.json();
      }
    } catch {
      throw new HttpError(400, "Le body JSON est invalide.");
    }

    const successUrl =
      safeString(body.successUrl) || `${SITE_URL}/checkout-success`;
    const cancelUrl =
      safeString(body.cancelUrl) || `${SITE_URL}/checkout`;

    const shippingName = safeString(body.shippingName);
    const shippingAddressLine1 = safeString(body.shippingAddressLine1);
    const shippingAddressLine2 = safeString(body.shippingAddressLine2);
    const shippingPostalCode = safeString(body.shippingPostalCode);
    const shippingCity = safeString(body.shippingCity);
    const shippingCountry = safeString(body.shippingCountry);
    const shippingEmail =
      safeString(body.shippingEmail) ||
      safeString(appUser.email) ||
      safeString(authUser.email);
    const shippingPhone = safeString(body.shippingPhone);
    const requestedShippingMethod = normalizeShippingMethod(body.shippingMethod);

    if (!shippingName) {
      throw new HttpError(400, "Nom de livraison manquant.");
    }

    if (!shippingAddressLine1 && requestedShippingMethod !== "pickup") {
      throw new HttpError(400, "Adresse de livraison manquante.");
    }

    if (!shippingPostalCode && requestedShippingMethod !== "pickup") {
      throw new HttpError(400, "Code postal manquant.");
    }

    if (!shippingCity && requestedShippingMethod !== "pickup") {
      throw new HttpError(400, "Ville manquante.");
    }

    if (!shippingCountry && requestedShippingMethod !== "pickup") {
      throw new HttpError(400, "Pays manquant.");
    }

    if (!shippingEmail) {
      throw new HttpError(400, "Email de livraison manquant.");
    }

    const { data: cartItems, error: cartError } = await supabase
      .from("cartItems")
      .select("*")
      .eq("userId", appUser.id)
      .order("createdAt", { ascending: false });

    if (cartError) {
      throw new HttpError(500, `Erreur panier: ${cartError.message}`);
    }

    if (!cartItems || cartItems.length === 0) {
      throw new HttpError(400, "Votre panier est vide.");
    }

    const productIds = cartItems.map((item: any) => item.productId);

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, title, price, stock, artistId, isActive")
      .in("id", productIds);

    if (productsError) {
      throw new HttpError(500, `Erreur produits: ${productsError.message}`);
    }

    const productsMap = new Map<number, any>();
    for (const product of productsData || []) {
      productsMap.set(Number(product.id), product);
    }

    const artistIds = new Set<number>();
    let productsSubtotalCents = 0;

    const productLineItems = cartItems.map((item: any) => {
      const product = productsMap.get(Number(item.productId));

      if (!product) {
        throw new HttpError(400, "Un produit du panier est introuvable.");
      }

      if (!product.isActive) {
        throw new HttpError(400, `Le produit "${product.title}" n'est plus disponible.`);
      }

      const quantity = safeNumber(item.quantity);
      if (quantity <= 0) {
        throw new HttpError(400, `Quantité invalide pour "${product.title}".`);
      }

      if (safeNumber(product.stock) < quantity) {
        throw new HttpError(400, `Stock insuffisant pour "${product.title}".`);
      }

      if (!product.artistId) {
        throw new HttpError(400, `Artiste introuvable pour "${product.title}".`);
      }

      artistIds.add(Number(product.artistId));

      const unitAmount = Math.round(safeNumber(product.price) * 100);
      if (unitAmount <= 0) {
        throw new HttpError(400, `Prix invalide pour "${product.title}".`);
      }

      productsSubtotalCents += unitAmount * quantity;

      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: product.title,
          },
          unit_amount: unitAmount,
        },
        quantity,
      };
    });

    if (artistIds.size !== 1) {
      throw new HttpError(
        400,
        "Le paiement Stripe n'accepte pour l'instant que des œuvres d'un seul artiste par commande."
      );
    }

    const artistId = Array.from(artistIds)[0];

    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select(`
        id,
        stripeAccountId,
        stripeOnboardingComplete,
        isActive,
        shippingStandardEnabled:shippingstandardenabled,
        shippingExpressEnabled:shippingexpressenabled,
        shippingPickupEnabled:shippingpickupenabled,
        shippingStandardPrice:shippingstandardprice,
        shippingExpressPrice:shippingexpressprice,
        freeShippingThreshold:freeshippingthreshold,
        shippingCountries:shippingcountries,
        shippingProcessingDays:shippingprocessingdays,
        pickupInstructions:pickupinstructions
      `)
      .eq("id", artistId)
      .maybeSingle();

    if (artistError) {
      throw new HttpError(500, `Erreur artiste: ${artistError.message}`);
    }

    if (!artist) {
      throw new HttpError(404, "Artiste introuvable.");
    }

    if (artist.isActive === false) {
      throw new HttpError(400, "Cet artiste n'est plus actif.");
    }

    if (!artist.stripeAccountId) {
      throw new HttpError(400, "Le compte Stripe de l'artiste n'est pas connecté.");
    }

    if (!artist.stripeOnboardingComplete) {
      throw new HttpError(400, "Le compte Stripe de l'artiste n'est pas entièrement configuré.");
    }

    const artistShippingSettings = buildArtistShippingSettings(
      artist as Record<string, unknown>
    );

    const shippingConfig = getShippingConfig({
      method: requestedShippingMethod,
      subtotalCents: productsSubtotalCents,
      settings: artistShippingSettings,
    });

    const shippingCostCents = shippingConfig.shippingCostCents;
    const totalAmountCents = productsSubtotalCents + shippingCostCents;

    const lineItems = [...productLineItems];

    if (shippingCostCents > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: shippingConfig.shippingLabel,
          },
          unit_amount: shippingCostCents,
        },
        quantity: 1,
      });
    }

    const applicationFeeAmount = computePlatformFeeCents(totalAmountCents);

    const metadata = {
      buyerUserId: String(appUser.id),
      artistId: String(artistId),
      stripeAccountId: String(artist.stripeAccountId),
      shippingMethod: shippingConfig.shippingMethod,
      shippingLabel: shippingConfig.shippingLabel,
      shippingCostCents: String(shippingCostCents),
      productsSubtotalCents: String(productsSubtotalCents),
      totalAmountCents: String(totalAmountCents),
      applicationFeeAmountCents: String(applicationFeeAmount),
      freeShippingThresholdCents: String(artistShippingSettings.freeShippingThresholdCents),
      isFreeShipping: shippingConfig.isFreeShipping ? "true" : "false",
      shippingCountries: artistShippingSettings.shippingCountries,
      shippingProcessingDays: String(artistShippingSettings.shippingProcessingDays),
      pickupInstructions: artistShippingSettings.pickupInstructions,
      shippingName,
      shippingAddressLine1,
      shippingAddressLine2,
      shippingPostalCode,
      shippingCity,
      shippingCountry,
      shippingEmail,
      shippingPhone,
    };

    console.log("create-checkout-session split payment", {
      artistId,
      stripeAccountId: artist.stripeAccountId,
      productsSubtotalCents,
      shippingCostCents,
      totalAmountCents,
      applicationFeeAmount,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      customer_email: shippingEmail || appUser.email || authUser.email || undefined,
      metadata,
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: artist.stripeAccountId,
        },
        metadata,
      },
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        shippingMethod: shippingConfig.shippingMethod,
        shippingLabel: shippingConfig.shippingLabel,
        shippingCostCents,
        productsSubtotalCents,
        totalAmountCents,
        applicationFeeAmountCents: applicationFeeAmount,
        destinationStripeAccountId: artist.stripeAccountId,
        isFreeShipping: shippingConfig.isFreeShipping,
        shippingCountries: artistShippingSettings.shippingCountries,
        shippingProcessingDays: artistShippingSettings.shippingProcessingDays,
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
    console.error("create-checkout-session error:", error);

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

    const message = error instanceof Error ? error.message : "Erreur inconnue";

    return new Response(
      JSON.stringify({ error: message }),
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