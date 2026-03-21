import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l’accueil
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
          <Shield className="h-4 w-4" />
          Confidentialité
        </div>

        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Politique de confidentialité
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-slate-600">
          La Toile Collective accorde une importance particulière à la protection des données
          personnelles de ses utilisateurs. Cette politique explique de manière simple quelles
          données peuvent être collectées, dans quel but elles sont utilisées, et comment elles
          sont protégées.
        </p>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl space-y-10 px-4 py-16">
          <div>
            <h2 className="text-2xl font-semibold">1. Données collectées</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Selon votre utilisation du site, La Toile Collective peut collecter certaines
              informations telles que votre nom, votre adresse e-mail, vos informations de compte,
              vos données de navigation, vos préférences, vos adresses de livraison et les
              informations nécessaires au traitement des commandes.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">2. Finalités de traitement</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Les données sont utilisées pour permettre le bon fonctionnement de la plateforme,
              gérer les comptes utilisateurs, traiter les commandes, assurer le suivi des achats,
              envoyer des communications utiles liées au service, améliorer l’expérience utilisateur
              et garantir la sécurité technique de la plateforme.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">3. Données de paiement</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Les paiements sont traités par des prestataires spécialisés et sécurisés. La Toile
              Collective ne conserve pas les informations bancaires complètes des utilisateurs sur
              ses propres serveurs.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">4. Données liées aux commandes</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Afin de permettre le traitement, la préparation et la livraison des commandes,
              certaines informations nécessaires, comme le nom, l’adresse de livraison, l’e-mail
              ou le téléphone, peuvent être utilisées dans le cadre strict du service fourni au
              client.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">5. Partage des données</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Les données ne sont partagées qu’avec les prestataires strictement nécessaires au
              fonctionnement de la plateforme, par exemple pour l’authentification, l’hébergement,
              le paiement, la fabrication ou la livraison. La Toile Collective ne vend pas les
              données personnelles de ses utilisateurs.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">6. Conservation</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Les données sont conservées pendant la durée nécessaire au fonctionnement du service,
              à la gestion des commandes, au respect des obligations légales et à la sécurité de la
              plateforme. La durée peut varier selon la nature des informations concernées.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">7. Sécurité</h2>
            <p className="mt-3 leading-8 text-slate-600">
              La Toile Collective met en œuvre des mesures techniques et organisationnelles
              raisonnables pour protéger les données personnelles contre l’accès non autorisé, la
              perte, l’altération ou la divulgation inappropriée.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">8. Cookies et navigation</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Le site peut utiliser des cookies ou technologies similaires afin d’améliorer la
              navigation, mémoriser certaines préférences, faciliter l’authentification ou produire
              des mesures d’usage utiles à l’amélioration du service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">9. Vos droits</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Selon la réglementation applicable, vous pouvez demander l’accès à vos données,
              leur rectification, leur suppression, ou encore exercer certains droits relatifs à
              leur traitement. Toute demande peut être adressée à la plateforme via l’adresse de
              contact indiquée ci-dessous.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">10. Mise à jour de la politique</h2>
            <p className="mt-3 leading-8 text-slate-600">
              La présente politique de confidentialité peut évoluer afin de refléter les
              améliorations du site, les évolutions techniques ou les obligations légales. La
              version publiée sur le site fait foi au moment de la consultation.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">11. Contact</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Pour toute question relative à la confidentialité ou à vos données personnelles, vous
              pouvez écrire à :{" "}
              <span className="font-medium text-slate-800">contact@latoilecollective.com</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}