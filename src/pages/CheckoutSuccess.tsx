import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type FinalizeCheckoutResponse = {
  success?: boolean;
  orderId?: number;
  totalAmount?: number;
  status?: string;
  createdAt?: string | null;
  alreadyProcessed?: boolean;
  error?: string;
};

type CreatePictoremOrderResponse = {
  success?: boolean;
  message?: string;
  orderId?: number;
  pictoremOrderId?: string | number | null;
  error?: string;
};

const PICTOREM_AFFILIATE_URL =
  "https://www.pictorem.com/fr/canvas-print.html?refer=SI10SBR2TUU";

export default function CheckoutSuccess() {
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSendingToPrint, setIsSendingToPrint] = useState(false);
  const [printSuccessMessage, setPrintSuccessMessage] = useState<string | null>(null);
  const [printErrorMessage, setPrintErrorMessage] = useState<string | null>(null);

  const hasStartedRef = useRef(false);

  const getAccessToken = async (): Promise<string | undefined> => {
    try {
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout session utilisateur.")), 3000)
        ),
      ]);

      return sessionResult.data.session?.access_token;
    } catch (sessionErr) {
      console.error("Erreur récupération session utilisateur :", sessionErr);
      return undefined;
    }
  };

  const finalizeCheckout = async (currentSessionId: string): Promise<number | null> => {
    setIsFinalizing(true);

    try {
      const accessToken = await getAccessToken();

      const finalizeResult = await Promise.race([
        supabase.functions.invoke<FinalizeCheckoutResponse>("finalize-checkout-session", {
          body: { sessionId: currentSessionId },
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : undefined,
        }),
        new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: null,
                error: new Error("Timeout finalize-checkout-session."),
              }),
            5000
          )
        ),
      ]);

      if ("error" in finalizeResult && finalizeResult.error) {
        console.error("Erreur finalize-checkout-session :", finalizeResult.error);
        return null;
      }

      const payload = "data" in finalizeResult ? finalizeResult.data : null;

      if (payload && typeof payload.orderId === "number") {
        setOrderId(payload.orderId);
        return payload.orderId;
      }

      return null;
    } catch (finalizeErr) {
      console.error("Erreur finalisation checkout :", finalizeErr);
      return null;
    } finally {
      setIsFinalizing(false);
    }
  };

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    let cancelled = false;

    const searchParams = new URLSearchParams(window.location.search);
    const currentSessionId = searchParams.get("session_id")?.trim();

    if (!currentSessionId) {
      setError("Aucune session Stripe valide n’a été trouvée.");
      return;
    }

    setSessionId(currentSessionId);

    void (async () => {
      try {
        const resolvedOrderId = await finalizeCheckout(currentSessionId);

        if (!cancelled && resolvedOrderId) {
          setOrderId(resolvedOrderId);
        }
      } catch (err) {
        console.error("Erreur checkout success :", err);

        if (!cancelled) {
          setError("Le paiement semble validé, mais la finalisation a rencontré un souci.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePrintOrder = async () => {
    if (!sessionId) {
      setPrintErrorMessage("Session Stripe introuvable.");
      return;
    }

    setIsSendingToPrint(true);
    setPrintSuccessMessage(null);
    setPrintErrorMessage(null);

    try {
      let currentOrderId = orderId;

      if (!currentOrderId) {
        currentOrderId = await finalizeCheckout(sessionId);
      }

      if (!currentOrderId) {
        throw new Error("La commande n’est pas encore prête. Réessayez dans quelques secondes.");
      }

      const accessToken = await getAccessToken();

      const result = await Promise.race([
        supabase.functions.invoke<CreatePictoremOrderResponse>("create-pictorem-order", {
          body: {
            sessionId,
            orderId: currentOrderId,
          },
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : undefined,
        }),
        new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: null,
                error: new Error("Timeout create-pictorem-order."),
              }),
            15000
          )
        ),
      ]);

      if ("error" in result && result.error) {
        throw result.error;
      }

      const payload = "data" in result ? result.data : null;

      if (!payload?.success) {
        throw new Error(
          payload?.error || "La demande d’impression automatique n’a pas pu être lancée."
        );
      }

      setPrintSuccessMessage(
        payload.message ||
          "La commande d’impression a bien été envoyée automatiquement à Pictorem."
      );
    } catch (err) {
      console.error("Erreur impression automatique :", err);

      setPrintErrorMessage(
        err instanceof Error
          ? err.message
          : "Impossible de lancer l’impression automatique pour le moment."
      );
    } finally {
      setIsSendingToPrint(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <div className="mb-4 flex items-center gap-2 text-red-900">
              <AlertCircle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Erreur de confirmation</h2>
            </div>

            <p className="mb-6 text-red-800">{error}</p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/cart"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-100"
              >
                Retour au panier
              </Link>

              <Link
                href="/gallery"
                className="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
              >
                Continuer les achats
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isButtonBusy = isSendingToPrint || isFinalizing;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>

            <h1 className="text-2xl font-bold text-green-900">Paiement réussi !</h1>

            <p className="mt-2 text-green-800">
              Merci pour votre achat. Votre commande a été confirmée.
            </p>

            {orderId ? (
              <p className="mt-2 text-sm text-slate-600">Commande #{orderId}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Numéro de commande en cours de récupération...
              </p>
            )}
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="mb-3 font-semibold text-slate-900">Prochaines étapes :</h3>

              <ul className="space-y-2 text-slate-700">
                <li className="flex gap-3">
                  <span className="font-bold text-green-600">✓</span>
                  <span>Votre commande a bien été enregistrée.</span>
                </li>

                <li className="flex gap-3">
                  <span className="font-bold text-green-600">✓</span>
                  <span>Le panier a été vidé automatiquement après validation.</span>
                </li>

                <li className="flex gap-3">
                  <span className="font-bold text-green-600">✓</span>
                  <span>Votre paiement Stripe a bien été confirmé.</span>
                </li>

                <li className="flex gap-3">
                  <span className="font-bold text-green-600">✓</span>
                  <span>Les notifications email ont été envoyées.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
              La finalisation technique de la commande se poursuit en arrière-plan si nécessaire.
            </div>

            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-slate-900">
                <ImageIcon className="h-5 w-5 text-amber-700" />
                <h3 className="text-lg font-semibold">Options d’impression premium</h3>
              </div>

              <p className="text-slate-700">
                Votre commande d’impression a bien été transmise. Vous pouvez aussi explorer
                d’autres formats, finitions et présentations pour sublimer votre œuvre.
              </p>

              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <div>• Formats supplémentaires</div>
                <div>• Finitions haut de gamme</div>
                <div>• Présentations décoratives et encadrements</div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handlePrintOrder}
                  disabled={isButtonBusy || !sessionId}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-center text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isButtonBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isSendingToPrint
                        ? "Envoi automatique en cours..."
                        : "Préparation de la commande..."}
                    </>
                  ) : (
                    <>
                      Lancer l’impression automatique
                      <ExternalLink className="h-4 w-4" />
                    </>
                  )}
                </button>

                <a
                  href={PICTOREM_AFFILIATE_URL}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-slate-800 transition hover:bg-slate-50"
                >
                  Voir plus d’options d’impression
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {printSuccessMessage ? (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-100 px-3 py-2 text-sm text-green-800">
                  {printSuccessMessage}
                </div>
              ) : null}

              {printErrorMessage ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-800">
                  {printErrorMessage}
                </div>
              ) : null}

              <p className="mt-3 text-sm text-slate-500">
                Vous pouvez aussi consulter Pictorem pour découvrir d’autres formats et finitions.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/gallery"
                className="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
              >
                Continuer les achats
              </Link>

              <Link
                href="/"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-100"
              >
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}