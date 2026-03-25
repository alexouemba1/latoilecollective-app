import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !message) {
      alert("Email et message requis");
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch(
        "https://wwtmamuueqdmetsnxlog.supabase.co/functions/v1/send-contact-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            message,
          }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur envoi email");
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white p-8 rounded-2xl border shadow-sm">

        {/* 🔙 Retour */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-amber-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l’accueil
          </Link>
        </div>

        {/* 🧠 Intro */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">
            Contactez-nous
          </h1>
          <p className="mt-2 text-slate-600 text-sm">
            Une question, une demande ou simplement envie d’échanger ?  
            Nous vous répondons rapidement.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Votre nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border p-3 rounded-lg"
          />

          <input
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-3 rounded-lg"
          />

          <textarea
            placeholder="Votre message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border p-3 rounded-lg h-32"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 disabled:opacity-60"
          >
            {loading ? "Envoi en cours..." : "Envoyer le message"}
          </button>
        </form>

        {/* ✅ Message succès premium */}
        {success && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
            <div className="flex justify-center mb-2">
              <CheckCircle2 className="text-green-600 w-6 h-6" />
            </div>
            <p className="font-semibold text-green-700">
              Message envoyé avec succès
            </p>
            <p className="text-sm text-green-700 mt-1">
              Nous vous répondrons sous 24h.
            </p>
          </div>
        )}

        {/* 🧾 Signature branding */}
        <p className="mt-6 text-center text-xs text-slate-400">
          La Toile Collective — une galerie pensée pour valoriser l’art
        </p>
      </div>
    </div>
  );
}