import { Resend } from "npm:resend@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const resendApiKey = Deno.env.get("RESEND_API_KEY");

if (!resendApiKey) {
  throw new Error("RESEND_API_KEY manquante.");
}

const resend = new Resend(resendApiKey);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, message } = await req.json();

    const safeName = typeof name === "string" ? name.trim() : "";
    const safeEmail = typeof email === "string" ? email.trim() : "";
    const safeMessage = typeof message === "string" ? message.trim() : "";

    if (!safeEmail || !safeMessage) {
      throw new Error("Champs manquants.");
    }

    const response = await resend.emails.send({
      from: "La Toile Collective <contact@latoilecolective.com>",
      to: ["alexouemba5@gmail.com"],
      subject: "Nouveau message contact",
      replyTo: safeEmail,
      html: `
        <h2>Nouveau message</h2>
        <p><strong>Nom :</strong> ${safeName || "Non renseigné"}</p>
        <p><strong>Email :</strong> ${safeEmail}</p>
        <p><strong>Message :</strong></p>
        <p>${safeMessage}</p>
      `,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: response,
      }),
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});