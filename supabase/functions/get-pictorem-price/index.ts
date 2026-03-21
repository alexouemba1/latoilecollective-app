import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundPremiumPrice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / 10) * 10 - 1;
}

function normalizeCountry(value: string): string {
  const country = safeString(value).toLowerCase();

  if (!country) return "France";
  if (country === "fr" || country === "france") return "France";
  if (country === "ca" || country === "canada") return "Canada";
  if (country === "us" || country === "usa" || country === "united states") return "USA";

  return safeString(value);
}

function getPictoremProvince(country: string): string {
  const normalized = country.toLowerCase();

  if (normalized === "canada") return "QC";
  if (normalized === "usa") return "NY";
  if (normalized === "france") return "IDF";

  return "QC";
}

function withQuantityInPreorderCode(baseCode: string, quantity: number): string {
  const cleaned = safeString(baseCode);

  if (!cleaned) {
    throw new Error("PICTOREM_PREORDER_CODE manquant.");
  }

  const parts = cleaned.split("|");

  if (parts.length < 6) {
    throw new Error("PICTOREM_PREORDER_CODE invalide.");
  }

  parts[0] = String(Math.max(1, quantity));
  return parts.join("|");
}

async function callPictoremGetPrice(params: {
  apiToken: string;
  preorderCode: string;
  deliveryCountry: string;
  deliveryProvince: string;
}) {
  const { apiToken, preorderCode, deliveryCountry, deliveryProvince } = params;

  const formData = new FormData();
  formData.append("preordercode", preorderCode);
  formData.append("deliverycountry", deliveryCountry);
  formData.append("deliveryprovince", deliveryProvince);

  const response = await fetch("https://www.pictorem.com/artflow/0.1/getprice/", {
    method: "POST",
    headers: {
      artFlowKey: apiToken,
    },
    body: formData,
  });

  const rawText = await response.text();

  let payload: any = null;
  try {
    payload = JSON.parse(rawText);
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(`Pictorem getprice HTTP ${response.status}: ${rawText}`);
  }

  if (!payload?.status) {
    const msg = Array.isArray(payload?.msg?.error)
      ? payload.msg.error.join(" | ")
      : safeString(payload?.msg) || "Impossible de récupérer le prix Pictorem.";

    throw new Error(msg);
  }

  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const pictoremApiToken = Deno.env.get("PICTOREM_API_TOKEN");
    const pictoremPreorderCode = Deno.env.get("PICTOREM_PREORDER_CODE");
    const usdToEurRate = safeNumber(Deno.env.get("USD_TO_EUR_RATE") ?? "0.87");

    if (!supabaseUrl) throw new Error("SUPABASE_URL manquante.");
    if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante.");
    if (!pictoremApiToken) throw new Error("PICTOREM_API_TOKEN manquante.");
    if (!pictoremPreorderCode) throw new Error("PICTOREM_PREORDER_CODE manquante.");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const authHeader = req.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "").trim();

    if (!accessToken) {
      throw new Error("Utilisateur non authentifié.");
    }

    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (authUserError || !authUserData.user) {
      throw new Error("Utilisateur non authentifié.");
    }

    let body: {
      quantity?: number;
      shippingCountry?: string;
      preorderCode?: string;
    } = {};

    try {
      const contentType = req.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        body = await req.json();
      }
    } catch {
      throw new Error("Le body JSON est invalide.");
    }

    const quantity = Math.max(1, safeNumber(body.quantity || 1));
    const shippingCountry = normalizeCountry(safeString(body.shippingCountry) || "France");
    const deliveryProvince = getPictoremProvince(shippingCountry);
    const preorderCode = withQuantityInPreorderCode(
      safeString(body.preorderCode) || pictoremPreorderCode,
      quantity
    );

    const pricePayload = await callPictoremGetPrice({
      apiToken: pictoremApiToken,
      preorderCode,
      deliveryCountry: shippingCountry,
      deliveryProvince,
    });

    const worksheet = pricePayload?.worksheet ?? {};
    const price = worksheet?.price ?? {};

    const totalUsd = safeNumber(price?.total);
    const subtotalUsd = safeNumber(price?.subTotal);
    const listMainUsd = safeNumber(price?.list?.main);
    const certificateUsd = safeNumber(price?.list?.cert);
    const taxPercentage = safeNumber(price?.taxes?.taxPercentage);

    const totalEur = Number((totalUsd * usdToEurRate).toFixed(2));
    const subtotalEur = Number((subtotalUsd * usdToEurRate).toFixed(2));
    const listMainEur = Number((listMainUsd * usdToEurRate).toFixed(2));
    const certificateEur = Number((certificateUsd * usdToEurRate).toFixed(2));

    const suggestedRetailPrice = roundPremiumPrice(totalEur * 2);

    return new Response(
      JSON.stringify({
        success: true,
        preorderCode,
        shippingCountry,
        deliveryProvince,
        currencySource: "USD",
        conversionRateUsdToEur: usdToEurRate,
        pictorem: {
          totalUsd,
          subtotalUsd,
          listMainUsd,
          certificateUsd,
          taxPercentage,
        },
        converted: {
          totalEur,
          subtotalEur,
          listMainEur,
          certificateEur,
        },
        suggestedRetailPrice,
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
    console.error("get-pictorem-price error:", error);

    const message = error instanceof Error ? error.message : "Erreur inconnue";

    return new Response(
      JSON.stringify({
        success: false,
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