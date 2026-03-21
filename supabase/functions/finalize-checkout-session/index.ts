import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_TEST_RECIPIENT = "alex.ouemba5@gmail.com";

type ShippingMethod = "standard" | "express" | "pickup";

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(amount: number): string {
  return `${amount.toFixed(2)}€`;
}

function centsToEuros(amountCents: number): number {
  return amountCents / 100;
}

function normalizeShippingMethod(value: unknown): ShippingMethod {
  const method = safeString(value).toLowerCase();

  if (method === "express") return "express";
  if (method === "pickup") return "pickup";
  return "standard";
}

function getShippingMethodLabel(method: ShippingMethod): string {
  if (method === "express") return "Livraison express";
  if (method === "pickup") return "Retrait sur place";
  return "Livraison standard";
}

function buildOrderEmailHtml(params: {
  orderId: number;
  totalAmount: number;
  createdAt: string | null;
  shippingName: string;
  shippingAddress: string;
  shippingPostalCode: string;
  shippingCity: string;
  shippingCountry: string;
  shippingEmail: string;
  shippingPhone: string;
  productsSubtotal: number;
  shippingMethod: ShippingMethod;
  shippingLabel: string;
  shippingCost: number;
  isFreeShipping: boolean;
}) {
  const {
    orderId,
    totalAmount,
    createdAt,
    shippingName,
    shippingAddress,
    shippingPostalCode,
    shippingCity,
    shippingCountry,
    shippingEmail,
    shippingPhone,
    productsSubtotal,
    shippingMethod,
    shippingLabel,
    shippingCost,
    isFreeShipping,
  } = params;

  const createdAtLabel = createdAt
    ? new Date(createdAt).toLocaleString("fr-FR")
    : "Date indisponible";

  const addressLines =
    shippingMethod === "pickup"
      ? [
          shippingName,
          shippingEmail ? `Email client : ${shippingEmail}` : "",
          shippingPhone ? `Téléphone : ${shippingPhone}` : "",
        ].filter(Boolean)
      : [
          shippingName,
          shippingAddress,
          [shippingPostalCode, shippingCity].filter(Boolean).join(" "),
          shippingCountry,
          shippingEmail ? `Email client : ${shippingEmail}` : "",
          shippingPhone ? `Téléphone : ${shippingPhone}` : "",
        ].filter(Boolean);

  const addressHtml = addressLines.map((line) => `<div>${line}</div>`).join("");

  const shippingAmountLabel =
    shippingMethod === "pickup"
      ? "Gratuit"
      : isFreeShipping
        ? "Offerte"
        : formatAmount(shippingCost);

  const addressTitle =
    shippingMethod === "pickup" ? "Informations de contact" : "Adresse de livraison";

  return `
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Confirmation de commande #${orderId}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #dbeafe;border-radius:16px;padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:32px;line-height:1;margin-bottom:12px;">✅</div>
          <h1 style="margin:0;font-size:28px;color:#166534;">Paiement réussi</h1>
          <p style="margin:12px 0 0 0;font-size:16px;color:#334155;">
            Merci pour votre achat. Votre commande a bien été confirmée.
          </p>
        </div>

        <div style="border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;background:#f0fdf4;">
          <div style="font-size:14px;color:#475569;margin-bottom:8px;">Numéro de commande</div>
          <div style="font-size:32px;font-weight:700;color:#0f172a;margin-bottom:16px;">#${orderId}</div>

          <div style="font-size:15px;color:#334155;line-height:1.8;">
            <div><strong>Montant total payé :</strong> ${formatAmount(totalAmount)}</div>
            <div><strong>Statut :</strong> completed</div>
            <div><strong>Date :</strong> ${createdAtLabel}</div>
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <h2 style="font-size:18px;margin:0 0 12px 0;color:#0f172a;">Récapitulatif du paiement</h2>
          <div style="font-size:15px;color:#334155;line-height:1.9;">
            <div><strong>Sous-total œuvres :</strong> ${formatAmount(productsSubtotal)}</div>
            <div><strong>Mode de livraison :</strong> ${shippingLabel || getShippingMethodLabel(shippingMethod)}</div>
            <div><strong>Livraison :</strong> ${shippingAmountLabel}</div>
            <div><strong>Total payé :</strong> ${formatAmount(totalAmount)}</div>
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <h2 style="font-size:18px;margin:0 0 12px 0;color:#0f172a;">${addressTitle}</h2>
          <div style="font-size:15px;color:#334155;line-height:1.8;">
            ${addressHtml}
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <h2 style="font-size:18px;margin:0 0 12px 0;color:#0f172a;">Prochaines étapes</h2>
          <div style="font-size:15px;color:#334155;line-height:1.9;">
            <div>✓ Votre commande a bien été enregistrée dans notre base.</div>
            <div>✓ Le panier a été vidé automatiquement après validation.</div>
            <div>✓ Votre paiement Stripe a bien été confirmé.</div>
          </div>
        </div>

        <div style="font-size:13px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:16px;">
          Cet email a été envoyé automatiquement par LATOILECOLLECTIVE.
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim();
}

function buildArtistOrderEmailHtml(params: {
  orderId: number;
  createdAt: string | null;
  artistName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingPostalCode: string;
  shippingCity: string;
  shippingCountry: string;
  shippingMethod: ShippingMethod;
  shippingLabel: string;
  shippingCost: number;
  isFreeShipping: boolean;
  items: Array<{
    title: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}) {
  const {
    orderId,
    createdAt,
    artistName,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    shippingPostalCode,
    shippingCity,
    shippingCountry,
    shippingMethod,
    shippingLabel,
    shippingCost,
    isFreeShipping,
    items,
  } = params;

  const createdAtLabel = createdAt
    ? new Date(createdAt).toLocaleString("fr-FR")
    : "Date indisponible";

  const itemsHtml = items
    .map((item) => {
      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;">${item.title}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatAmount(item.unitPrice)}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatAmount(item.lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  const totalArtistAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

  const shippingAmountLabel =
    shippingMethod === "pickup"
      ? "Gratuit"
      : isFreeShipping
        ? "Offerte"
        : formatAmount(shippingCost);

  const addressTitle =
    shippingMethod === "pickup" ? "Informations de contact" : "Adresse de livraison";

  return `
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Nouvelle commande artiste #${orderId}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:760px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #dbeafe;border-radius:16px;padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:32px;line-height:1;margin-bottom:12px;">🎨</div>
          <h1 style="margin:0;font-size:28px;color:#0f172a;">Nouvelle commande reçue</h1>
          <p style="margin:12px 0 0 0;font-size:16px;color:#334155;">
            Bonjour ${artistName || "Artiste"}, voici les œuvres qui vous concernent pour la commande #${orderId}.
          </p>
        </div>

        <div style="border:1px solid #dbeafe;border-radius:12px;padding:20px;margin-bottom:24px;background:#f8fbff;">
          <div style="font-size:15px;color:#334155;line-height:1.9;">
            <div><strong>Commande :</strong> #${orderId}</div>
            <div><strong>Date :</strong> ${createdAtLabel}</div>
            <div><strong>Total de vos œuvres :</strong> ${formatAmount(totalArtistAmount)}</div>
            <div><strong>Livraison choisie :</strong> ${shippingLabel || getShippingMethodLabel(shippingMethod)}</div>
            <div><strong>Frais de livraison :</strong> ${shippingAmountLabel}</div>
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <h2 style="font-size:18px;margin:0 0 12px 0;color:#0f172a;">Client</h2>
          <div style="font-size:15px;color:#334155;line-height:1.8;">
            <div>${customerName || "Nom indisponible"}</div>
            ${customerEmail ? `<div>Email : ${customerEmail}</div>` : ""}
            ${customerPhone ? `<div>Téléphone : ${customerPhone}</div>` : ""}
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <h2 style="font-size:18px;margin:0 0 12px 0;color:#0f172a;">${addressTitle}</h2>
          <div style="font-size:15px;color:#334155;line-height:1.8;">
            ${
              shippingMethod === "pickup"
                ? `
                  <div>${customerName || "Nom indisponible"}</div>
                  ${customerEmail ? `<div>Email : ${customerEmail}</div>` : ""}
                  ${customerPhone ? `<div>Téléphone : ${customerPhone}</div>` : ""}
                `
                : `
                  ${shippingAddress ? `<div>${shippingAddress}</div>` : ""}
                  <div>${[shippingPostalCode, shippingCity].filter(Boolean).join(" ")}</div>
                  ${shippingCountry ? `<div>${shippingCountry}</div>` : ""}
                `
            }
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <h2 style="font-size:18px;margin:0 0 12px 0;color:#0f172a;">Œuvres concernées</h2>
          <table style="width:100%;border-collapse:collapse;font-size:15px;color:#334155;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:12px;text-align:left;border-bottom:1px solid #cbd5e1;">Œuvre</th>
                <th style="padding:12px;text-align:center;border-bottom:1px solid #cbd5e1;">Qté</th>
                <th style="padding:12px;text-align:right;border-bottom:1px solid #cbd5e1;">Prix</th>
                <th style="padding:12px;text-align:right;border-bottom:1px solid #cbd5e1;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div style="font-size:13px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:16px;">
          Cet email a été envoyé automatiquement par LATOILECOLLECTIVE.
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim();
}

async function sendConfirmationEmail(params: {
  resendApiKey: string;
  orderId: number;
  totalAmount: number;
  createdAt: string | null;
  shippingName: string;
  shippingAddress: string;
  shippingPostalCode: string;
  shippingCity: string;
  shippingCountry: string;
  shippingEmail: string;
  shippingPhone: string;
  productsSubtotal: number;
  shippingMethod: ShippingMethod;
  shippingLabel: string;
  shippingCost: number;
  isFreeShipping: boolean;
}) {
  const {
    resendApiKey,
    orderId,
    totalAmount,
    createdAt,
    shippingName,
    shippingAddress,
    shippingPostalCode,
    shippingCity,
    shippingCountry,
    shippingEmail,
    shippingPhone,
    productsSubtotal,
    shippingMethod,
    shippingLabel,
    shippingCost,
    isFreeShipping,
  } = params;

  const emailHtml = buildOrderEmailHtml({
    orderId,
    totalAmount,
    createdAt,
    shippingName,
    shippingAddress,
    shippingPostalCode,
    shippingCity,
    shippingCountry,
    shippingEmail,
    shippingPhone,
    productsSubtotal,
    shippingMethod,
    shippingLabel,
    shippingCost,
    isFreeShipping,
  });

  console.log(
    `resend email attempt: envoi vers ${RESEND_TEST_RECIPIENT} / client ${shippingEmail || "email indisponible"} / commande #${orderId}`
  );

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "LATOILECOLLECTIVE <onboarding@resend.dev>",
      to: [RESEND_TEST_RECIPIENT],
      subject: `Confirmation de votre commande #${orderId}`,
      html: emailHtml,
    }),
  });

  const resendBodyText = await resendResponse.text();

  if (!resendResponse.ok) {
    console.error("resend email error:", resendBodyText);
    return;
  }

  console.log("resend email success:", resendBodyText);
}

async function sendArtistEmailsForOrder(params: {
  supabaseAdmin: ReturnType<typeof createClient>;
  resendApiKey: string;
  orderId: number;
  createdAt: string | null;
  shippingName: string;
  shippingAddress: string;
  shippingPostalCode: string;
  shippingCity: string;
  shippingCountry: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingMethod: ShippingMethod;
  shippingLabel: string;
  shippingCost: number;
  isFreeShipping: boolean;
}) {
  const {
    supabaseAdmin,
    resendApiKey,
    orderId,
    createdAt,
    shippingName,
    shippingAddress,
    shippingPostalCode,
    shippingCity,
    shippingCountry,
    shippingEmail,
    shippingPhone,
    shippingMethod,
    shippingLabel,
    shippingCost,
    isFreeShipping,
  } = params;

  try {
    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from("orderItems")
      .select("orderId, productId, artistId, quantity, priceAtPurchase")
      .eq("orderId", orderId);

    if (orderItemsError) {
      console.error("artist email / erreur lecture orderItems:", orderItemsError.message);
      return;
    }

    if (!orderItems || orderItems.length === 0) {
      console.log(`artist email / aucun orderItem trouvé pour la commande #${orderId}`);
      return;
    }

    const productIds = [
      ...new Set(
        orderItems
          .map((item: Record<string, unknown>) => safeNumber(item.productId))
          .filter((id) => id > 0)
      ),
    ];

    const artistIds = [
      ...new Set(
        orderItems
          .map((item: Record<string, unknown>) => safeNumber(item.artistId))
          .filter((id) => id > 0)
      ),
    ];

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, title")
      .in("id", productIds.length > 0 ? productIds : [0]);

    if (productsError) {
      console.error("artist email / erreur lecture products:", productsError.message);
      return;
    }

    const { data: artists, error: artistsError } = await supabaseAdmin
      .from("artists")
      .select("id, userId")
      .in("id", artistIds.length > 0 ? artistIds : [0]);

    if (artistsError) {
      console.error("artist email / erreur lecture artists:", artistsError.message);
      return;
    }

    const artistUserIds = [
      ...new Set(
        (artists || [])
          .map((artist: Record<string, unknown>) => safeNumber(artist.userId))
          .filter((id) => id > 0)
      ),
    ];

    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, email, name")
      .in("id", artistUserIds.length > 0 ? artistUserIds : [0]);

    if (usersError) {
      console.error("artist email / erreur lecture users:", usersError.message);
      return;
    }

    const productById = new Map<
      number,
      {
        id: number;
        title: string;
      }
    >();

    for (const product of (products || []) as Array<Record<string, unknown>>) {
      const productId = safeNumber(product.id);
      if (!productId) continue;

      productById.set(productId, {
        id: productId,
        title: safeString(product.title) || `Œuvre #${productId}`,
      });
    }

    const artistToUserId = new Map<number, number>();

    for (const artist of (artists || []) as Array<Record<string, unknown>>) {
      const artistId = safeNumber(artist.id);
      const userId = safeNumber(artist.userId);

      if (!artistId || !userId) continue;
      artistToUserId.set(artistId, userId);
    }

    const userById = new Map<
      number,
      {
        id: number;
        email: string;
        name: string;
      }
    >();

    for (const user of (users || []) as Array<Record<string, unknown>>) {
      const userId = safeNumber(user.id);
      if (!userId) continue;

      userById.set(userId, {
        id: userId,
        email: safeString(user.email),
        name: safeString(user.name) || `Artiste #${userId}`,
      });
    }

    const itemsByArtist = new Map<
      number,
      Array<{
        title: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }>
    >();

    for (const item of orderItems as Array<Record<string, unknown>>) {
      const productId = safeNumber(item.productId);
      const artistId = safeNumber(item.artistId);

      if (!productId || !artistId) {
        continue;
      }

      const product = productById.get(productId);
      const quantity = safeNumber(item.quantity) || 1;
      const unitPrice = safeNumber(item.priceAtPurchase);
      const lineTotal = quantity * unitPrice;

      if (!itemsByArtist.has(artistId)) {
        itemsByArtist.set(artistId, []);
      }

      itemsByArtist.get(artistId)?.push({
        title: product?.title || `Œuvre #${productId}`,
        quantity,
        unitPrice,
        lineTotal,
      });
    }

    if (itemsByArtist.size === 0) {
      console.log(`artist email / aucun regroupement artiste trouvé pour la commande #${orderId}`);
      return;
    }

    for (const [artistId, items] of itemsByArtist.entries()) {
      const userId = artistToUserId.get(artistId);

      if (!userId) {
        console.log(`artist email / userId introuvable pour artistId=${artistId}`);
        continue;
      }

      const artistUser = userById.get(userId);

      if (!artistUser) {
        console.log(`artist email / utilisateur artiste introuvable pour artistId=${artistId}`);
        continue;
      }

      if (items.length === 0) {
        console.log(`artist email / aucun item pour artistId=${artistId}`);
        continue;
      }

      const artistEmailHtml = buildArtistOrderEmailHtml({
        orderId,
        createdAt,
        artistName: artistUser.name,
        customerName: shippingName,
        customerEmail: shippingEmail,
        customerPhone: shippingPhone,
        shippingAddress,
        shippingPostalCode,
        shippingCity,
        shippingCountry,
        shippingMethod,
        shippingLabel,
        shippingCost,
        isFreeShipping,
        items,
      });

      console.log(
        `artist email attempt: commande #${orderId} / artiste ${artistUser.email || "email indisponible"} / test ${RESEND_TEST_RECIPIENT} / items ${items.length}`
      );

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "LATOILECOLLECTIVE <onboarding@resend.dev>",
          to: [RESEND_TEST_RECIPIENT],
          subject: `Nouvelle commande #${orderId} - vos œuvres`,
          html: artistEmailHtml,
        }),
      });

      const resendBodyText = await resendResponse.text();

      if (!resendResponse.ok) {
        console.error(`artist email error / artistId=${artistId}:`, resendBodyText);
        continue;
      }

      console.log(`artist email success / artistId=${artistId}:`, resendBodyText);
    }
  } catch (error) {
    console.error("artist email fatal error:", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY manquante.");
    if (!supabaseUrl) throw new Error("SUPABASE_URL manquante.");
    if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante.");
    if (!resendApiKey) throw new Error("RESEND_API_KEY manquante.");

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    let body: { sessionId?: string } = {};

    try {
      const contentType = req.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        body = await req.json();
      }
    } catch {
      throw new Error("Le body JSON est invalide.");
    }

    const sessionId = safeString(body?.sessionId);

    if (!sessionId) {
      throw new Error("sessionId manquant.");
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      throw new Error("Le paiement Stripe n'est pas confirmé.");
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    if (!paymentIntentId) {
      throw new Error("PaymentIntent Stripe introuvable.");
    }

    const buyerUserIdFromMetadata = Number(session.metadata?.buyerUserId ?? 0);

    if (!buyerUserIdFromMetadata) {
      throw new Error("buyerUserId manquant dans les métadonnées Stripe.");
    }

    const { data: appUser, error: appUserError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("id", buyerUserIdFromMetadata)
      .maybeSingle();

    if (appUserError) {
      throw new Error(`Erreur utilisateur: ${appUserError.message}`);
    }

    if (!appUser) {
      throw new Error("Profil utilisateur introuvable.");
    }

    const shippingName = safeString(session.metadata?.shippingName);
    const shippingAddressLine1 = safeString(session.metadata?.shippingAddressLine1);
    const shippingAddressLine2 = safeString(session.metadata?.shippingAddressLine2);
    const shippingPostalCode = safeString(session.metadata?.shippingPostalCode);
    const shippingCity = safeString(session.metadata?.shippingCity);
    const shippingCountry = safeString(session.metadata?.shippingCountry);
    const shippingEmail =
      safeString(session.metadata?.shippingEmail) || safeString(appUser.email);
    const shippingPhone = safeString(session.metadata?.shippingPhone);

    const shippingMethod = normalizeShippingMethod(session.metadata?.shippingMethod);
    const shippingLabel =
      safeString(session.metadata?.shippingLabel) || getShippingMethodLabel(shippingMethod);

    const shippingCostCents = safeNumber(session.metadata?.shippingCostCents);
    const productsSubtotalCents = safeNumber(session.metadata?.productsSubtotalCents);
    const totalAmountCentsFromMetadata = safeNumber(session.metadata?.totalAmountCents);
    const stripeAmountTotalCents = safeNumber(session.amount_total);
    const isFreeShipping = safeString(session.metadata?.isFreeShipping).toLowerCase() === "true";

    const shippingCost = centsToEuros(shippingCostCents);
    const productsSubtotal = centsToEuros(productsSubtotalCents);

    const finalTotalAmount =
      stripeAmountTotalCents > 0
        ? centsToEuros(stripeAmountTotalCents)
        : totalAmountCentsFromMetadata > 0
          ? centsToEuros(totalAmountCentsFromMetadata)
          : 0;

    const fullShippingAddress = [shippingAddressLine1, shippingAddressLine2]
      .filter((value) => value.length > 0)
      .join(", ");

    const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
      .from("orders")
      .select("id, totalAmount, status, createdAt")
      .eq("buyerId", appUser.id)
      .eq("stripePaymentIntentId", paymentIntentId)
      .maybeSingle();

    if (existingOrderError) {
      throw new Error(`Erreur lecture commande: ${existingOrderError.message}`);
    }

    if (existingOrder) {
      console.log(`commande déjà traitée : #${existingOrder.id}, aucun renvoi d'email`);

      return new Response(
        JSON.stringify({
          success: true,
          orderId: existingOrder.id,
          totalAmount: Number(existingOrder.totalAmount ?? 0),
          status: existingOrder.status ?? "completed",
          createdAt: existingOrder.createdAt ?? null,
          alreadyProcessed: true,
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

    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("create_checkout_order", {
      buyer_user_id: buyerUserIdFromMetadata,
    });

    if (rpcError) {
      throw new Error(`Erreur création commande: ${rpcError.message}`);
    }

    const result = rpcData as
      | {
          success?: boolean;
          orderId?: number;
          totalAmount?: number;
          status?: string;
          error?: string;
          message?: string;
        }
      | null;

    const orderId =
      result && typeof result.orderId === "number" && !Number.isNaN(result.orderId)
        ? result.orderId
        : null;

    if (!orderId) {
      throw new Error(result?.error || result?.message || "Commande non créée.");
    }

    const fallbackOrderAmount = safeNumber(result?.totalAmount);

    const orderTotalToSave =
      finalTotalAmount > 0 ? finalTotalAmount : fallbackOrderAmount;

    const { data: updatedOrder, error: updateOrderError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "completed",
        totalAmount: orderTotalToSave,
        stripePaymentIntentId: paymentIntentId,
        shipping_name: shippingName || null,
        shipping_address: fullShippingAddress || null,
        shipping_postal_code: shippingPostalCode || null,
        shipping_city: shippingCity || null,
        shipping_country: shippingCountry || null,
        shipping_email: shippingEmail || null,
        shipping_phone: shippingPhone || null,
        shipping_status: "pending",
      })
      .eq("id", orderId)
      .eq("buyerId", appUser.id)
      .select("id, totalAmount, status, createdAt")
      .maybeSingle();

    if (updateOrderError) {
      throw new Error(`Erreur mise à jour commande: ${updateOrderError.message}`);
    }

    if (!updatedOrder) {
      throw new Error("Commande mise à jour introuvable.");
    }

    const emailTotalAmount =
      finalTotalAmount > 0 ? finalTotalAmount : Number(updatedOrder.totalAmount ?? 0);

    const emailProductsSubtotal =
      productsSubtotal > 0
        ? productsSubtotal
        : Math.max(0, emailTotalAmount - shippingCost);

    try {
      await sendConfirmationEmail({
        resendApiKey,
        orderId: updatedOrder.id,
        totalAmount: emailTotalAmount,
        createdAt: updatedOrder.createdAt ?? null,
        shippingName,
        shippingAddress: fullShippingAddress,
        shippingPostalCode,
        shippingCity,
        shippingCountry,
        shippingEmail,
        shippingPhone,
        productsSubtotal: emailProductsSubtotal,
        shippingMethod,
        shippingLabel,
        shippingCost,
        isFreeShipping,
      });
    } catch (emailError) {
      console.error("Erreur envoi email client:", emailError);
    }

    try {
      await sendArtistEmailsForOrder({
        supabaseAdmin,
        resendApiKey,
        orderId: updatedOrder.id,
        createdAt: updatedOrder.createdAt ?? null,
        shippingName,
        shippingAddress: fullShippingAddress,
        shippingPostalCode,
        shippingCity,
        shippingCountry,
        shippingEmail,
        shippingPhone,
        shippingMethod,
        shippingLabel,
        shippingCost,
        isFreeShipping,
      });
    } catch (artistEmailError) {
      console.error("Erreur envoi emails artistes:", artistEmailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: updatedOrder.id,
        totalAmount: emailTotalAmount,
        status: updatedOrder.status ?? "completed",
        createdAt: updatedOrder.createdAt ?? null,
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
    console.error("finalize-checkout-session error:", error);

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