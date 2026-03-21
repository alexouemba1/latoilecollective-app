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

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const cleaned = safeString(fullName);

  if (!cleaned) {
    return {
      firstName: "Client",
      lastName: "LaToileCollective",
    };
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "Client",
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.slice(-1).join(" "),
  };
}

function normalizeCountry(value: string): string {
  const country = safeString(value).toLowerCase();

  if (!country) return "France";
  if (country === "fr" || country === "france") return "France";
  if (country === "usa" || country === "us" || country === "united states") return "USA";
  if (country === "uk" || country === "united kingdom") return "United Kingdom";

  return safeString(value);
}

function detectFileTypeFromUrl(url: string): "jpg" | "png" | "tiff" {
  const lower = safeString(url).toLowerCase();

  if (lower.includes(".png")) return "png";
  if (lower.includes(".tif") || lower.includes(".tiff")) return "tiff";
  return "jpg";
}

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.map((item) => safeString(item)).filter(Boolean);
  }

  if (typeof images === "string") {
    const raw = images.trim();

    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => safeString(item)).filter(Boolean);
      }
    } catch {
      return [raw];
    }
  }

  return [];
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

async function callPictoremValidate(params: {
  apiToken: string;
  preorderCode: string;
}) {
  const { apiToken, preorderCode } = params;

  const formData = new FormData();
  formData.append("preordercode", preorderCode);

  const response = await fetch("https://www.pictorem.com/artflow/0.1/validatepreorder/", {
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
    throw new Error(`Pictorem validatepreorder HTTP ${response.status}: ${rawText}`);
  }

  if (!payload?.status) {
    const msg = Array.isArray(payload?.msg?.error)
      ? payload.msg.error.join(" | ")
      : safeString(payload?.msg) || "PreOrder Code invalide chez Pictorem.";

    throw new Error(msg);
  }

  return payload;
}

async function callPictoremSendOrder(params: {
  apiToken: string;
  orderComment: string;
  deliveryFirstName: string;
  deliveryLastName: string;
  deliveryCompany: string;
  deliveryAddress1: string;
  deliveryAddress2: string;
  deliveryCity: string;
  deliveryProvince: string;
  deliveryCountry: string;
  deliveryCp: string;
  deliveryPhone: string;
  items: Array<{
    preorderCode: string;
    imageUrl: string;
    fileType: "jpg" | "png" | "tiff";
  }>;
}) {
  const {
    apiToken,
    orderComment,
    deliveryFirstName,
    deliveryLastName,
    deliveryCompany,
    deliveryAddress1,
    deliveryAddress2,
    deliveryCity,
    deliveryProvince,
    deliveryCountry,
    deliveryCp,
    deliveryPhone,
    items,
  } = params;

  const formData = new FormData();

  formData.append("ordercomment", orderComment);
  formData.append("deliveryInfo[firstname]", deliveryFirstName);
  formData.append("deliveryInfo[lastname]", deliveryLastName);
  formData.append("deliveryInfo[company]", deliveryCompany);
  formData.append("deliveryInfo[address1]", deliveryAddress1);
  formData.append("deliveryInfo[address2]", deliveryAddress2);
  formData.append("deliveryInfo[city]", deliveryCity);
  formData.append("deliveryInfo[province]", deliveryProvince);
  formData.append("deliveryInfo[country]", deliveryCountry);
  formData.append("deliveryInfo[cp]", deliveryCp);
  formData.append("deliveryInfo[phone]", deliveryPhone);

  items.forEach((item, index) => {
    formData.append(`orderList[${index}][code]`, item.preorderCode);
    formData.append(`orderList[${index}][fileurl]`, item.imageUrl);
    formData.append(`orderList[${index}][filetype]`, item.fileType);
  });

  const response = await fetch("https://www.pictorem.com/artflow/0.1/sendorder/", {
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
    throw new Error(`Pictorem sendorder HTTP ${response.status}: ${rawText}`);
  }

  if (!payload?.status) {
    const msg = Array.isArray(payload?.msg?.error)
      ? payload.msg.error.join(" | ")
      : safeString(payload?.msg) || "Envoi Pictorem refusé.";

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
    const pictoremOrderComment =
      Deno.env.get("PICTOREM_ORDER_COMMENT") ||
      "Commande envoyee automatiquement depuis La Toile Collective.";

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
      orderId?: number;
      sessionId?: string;
    } = {};

    try {
      const contentType = req.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        body = await req.json();
      }
    } catch {
      throw new Error("Le body JSON est invalide.");
    }

    const orderId = safeNumber(body.orderId);

    if (!orderId) {
      throw new Error("orderId manquant.");
    }

    const { data: appUser, error: appUserError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("email", authUserData.user.email ?? "")
      .maybeSingle();

    if (appUserError) {
      throw new Error(`Erreur utilisateur: ${appUserError.message}`);
    }

    if (!appUser) {
      throw new Error("Profil utilisateur introuvable.");
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        buyerId,
        status,
        shipping_name,
        shipping_address,
        shipping_postal_code,
        shipping_city,
        shipping_country,
        shipping_email,
        shipping_phone,
        pictorem_sent,
        pictorem_order_id
      `)
      .eq("id", orderId)
      .eq("buyerId", appUser.id)
      .maybeSingle();

    if (orderError) {
      throw new Error(`Erreur lecture commande: ${orderError.message}`);
    }

    if (!order) {
      throw new Error("Commande introuvable.");
    }

    if (order.pictorem_sent === true) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Commande déjà envoyée à Pictorem.",
          orderId,
          pictoremOrderId: order.pictorem_order_id ?? null,
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

    if (safeString(order.status).toLowerCase() !== "completed") {
      throw new Error("La commande n'est pas finalisée.");
    }

    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from("orderItems")
      .select("orderId, productId, quantity")
      .eq("orderId", orderId);

    if (orderItemsError) {
      throw new Error(`Erreur lecture orderItems: ${orderItemsError.message}`);
    }

    if (!orderItems || orderItems.length === 0) {
      throw new Error("Aucun article trouvé pour cette commande.");
    }

    const productIds = orderItems
      .map((item: Record<string, unknown>) => safeNumber(item.productId))
      .filter((id) => id > 0);

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, title, images")
      .in("id", productIds);

    if (productsError) {
      throw new Error(`Erreur lecture products: ${productsError.message}`);
    }

    const productMap = new Map<number, { id: number; title: string; images: string[] }>();

    for (const product of (products || []) as Array<Record<string, unknown>>) {
      const productId = safeNumber(product.id);
      if (!productId) continue;

      productMap.set(productId, {
        id: productId,
        title: safeString(product.title) || `Produit #${productId}`,
        images: parseImages(product.images),
      });
    }

    const pictoremItems: Array<{
      preorderCode: string;
      imageUrl: string;
      fileType: "jpg" | "png" | "tiff";
    }> = [];

    for (const item of orderItems as Array<Record<string, unknown>>) {
      const productId = safeNumber(item.productId);
      const quantity = Math.max(1, safeNumber(item.quantity));

      const product = productMap.get(productId);

      if (!product) {
        throw new Error(`Produit introuvable pour productId=${productId}.`);
      }

      const imageUrl = product.images[0];

      if (!imageUrl) {
        throw new Error(`Aucune image trouvée pour "${product.title}".`);
      }

      const preorderCode = withQuantityInPreorderCode(pictoremPreorderCode, quantity);

      await callPictoremValidate({
        apiToken: pictoremApiToken,
        preorderCode,
      });

      pictoremItems.push({
        preorderCode,
        imageUrl,
        fileType: detectFileTypeFromUrl(imageUrl),
      });
    }

    const fullName = safeString(order.shipping_name);
    const { firstName, lastName } = splitFullName(fullName);

    const shippingAddress = safeString(order.shipping_address);
    const shippingCity = safeString(order.shipping_city);
    const shippingCountry = normalizeCountry(safeString(order.shipping_country));
    const shippingPostalCode = safeString(order.shipping_postal_code);
    const shippingPhone = safeString(order.shipping_phone);
    const shippingEmail = safeString(order.shipping_email);

    if (!shippingAddress) {
      throw new Error("Adresse de livraison manquante.");
    }

    if (!shippingCity) {
      throw new Error("Ville de livraison manquante.");
    }

    if (!shippingCountry) {
      throw new Error("Pays de livraison manquant.");
    }

    if (!shippingPostalCode) {
      throw new Error("Code postal de livraison manquant.");
    }

    const pictoremResponse = await callPictoremSendOrder({
      apiToken: pictoremApiToken,
      orderComment: `${pictoremOrderComment} Commande locale #${orderId}. ${
        shippingEmail ? `Client: ${shippingEmail}.` : ""
      }`.trim(),
      deliveryFirstName: firstName,
      deliveryLastName: lastName,
      deliveryCompany: "",
      deliveryAddress1: shippingAddress,
      deliveryAddress2: "",
      deliveryCity: shippingCity,
      deliveryProvince: shippingCity,
      deliveryCountry: shippingCountry,
      deliveryCp: shippingPostalCode,
      deliveryPhone: shippingPhone || "0000000000",
      items: pictoremItems,
    });

    const pictoremOrderId = pictoremResponse?.orderid ?? null;

    const { error: updateOrderError } = await supabaseAdmin
      .from("orders")
      .update({
        pictorem_sent: true,
        pictorem_order_id: pictoremOrderId,
      })
      .eq("id", orderId)
      .eq("buyerId", appUser.id);

    if (updateOrderError) {
      throw new Error(`Erreur mise à jour commande Pictorem: ${updateOrderError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "La commande d’impression a été envoyée automatiquement à Pictorem.",
        orderId,
        pictoremOrderId,
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
    console.error("create-pictorem-order error:", error);

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