import { Link } from "wouter";
import { ArrowLeft, BadgeCheck, Sparkles } from "lucide-react";

export default function Quality() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      {/* HEADER */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l’accueil
          </Link>
        </div>
      </div>

      {/* HERO */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
          <Sparkles className="h-4 w-4" />
          Qualité & fabrication
        </div>

        <h1 className="text-5xl font-bold tracking-tight">
          Une exigence de qualité au service de l’œuvre
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Chaque création est produite avec des standards professionnels afin de garantir
          une restitution fidèle, élégante et durable. Ici, chaque détail compte.
        </p>
      </section>

      {/* EXIGENCE */}
      <section className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-6 text-3xl font-bold">Notre exigence</h2>

          <p className="mb-4 text-lg text-slate-600">
            Nous accordons une attention particulière à la qualité de reproduction de chaque œuvre.
            L’objectif est simple : préserver l’intention artistique originale tout en offrant un
            rendu visuel à la hauteur des attentes les plus élevées.
          </p>

          <p className="text-lg text-slate-600">
            Couleurs profondes, détails précis, textures respectées — chaque impression est pensée
            pour donner à l’œuvre une présence forte et authentique dans votre espace.
          </p>
        </div>
      </section>

      {/* PROCESS */}
      <section className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-12 text-3xl font-bold text-center">Comment ça fonctionne</h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {[
              "Vous choisissez une œuvre",
              "Production à la demande",
              "Préparation soignée",
              "Livraison sécurisée",
            ].map((step, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
              >
                <div className="mb-4 text-2xl font-bold text-amber-600">
                  {index + 1}
                </div>
                <p className="text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PREMIUM */}
      <section className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Pourquoi c’est premium
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-6">
              <h3 className="mb-2 font-semibold">Qualité fine art</h3>
              <p className="text-sm text-slate-600">
                Une impression professionnelle fidèle à l’œuvre originale.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6">
              <h3 className="mb-2 font-semibold">Production à la demande</h3>
              <p className="text-sm text-slate-600">
                Chaque pièce est produite uniquement après commande.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6">
              <h3 className="mb-2 font-semibold">Finitions premium</h3>
              <p className="text-sm text-slate-600">
                Des matériaux sélectionnés pour un rendu élégant et durable.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6">
              <h3 className="mb-2 font-semibold">Livraison sécurisée</h3>
              <p className="text-sm text-slate-600">
                Une préparation et un transport pensés pour protéger l’œuvre.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL */}
      <section className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="inline-flex items-center gap-2 text-amber-600">
            <BadgeCheck className="h-5 w-5" />
            <span className="font-semibold">Engagement qualité</span>
          </div>

          <p className="mt-6 text-xl text-slate-700">
            Chaque œuvre est produite avec des standards professionnels afin d’offrir une expérience
            haut de gamme, fidèle à la vision de l’artiste.
          </p>
        </div>
      </section>
    </div>
  );
}