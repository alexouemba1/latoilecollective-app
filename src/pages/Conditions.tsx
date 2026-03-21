import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";

export default function Conditions() {
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
          <FileText className="h-4 w-4" />
          Conditions d’utilisation
        </div>

        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Conditions générales d’utilisation et de vente
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-slate-600">
          Les présentes conditions encadrent l’utilisation du site La Toile Collective,
          plateforme dédiée à la mise en relation entre artistes et acheteurs pour la
          découverte, la présentation et la vente d’œuvres et créations artistiques.
        </p>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl space-y-10 px-4 py-16">
          <div>
            <h2 className="text-2xl font-semibold">1. Objet de la plateforme</h2>
            <p className="mt-3 leading-8 text-slate-600">
              La Toile Collective permet à des artistes de créer un espace personnel, de
              présenter leurs œuvres, de fixer leurs prix et de proposer leurs créations à la
              vente. Le site agit comme une plateforme de présentation, de diffusion et de
              facilitation des commandes.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">2. Comptes utilisateurs</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Certains services nécessitent la création d’un compte. Chaque utilisateur s’engage
              à fournir des informations exactes, à maintenir la confidentialité de ses accès et
              à ne pas utiliser la plateforme de manière frauduleuse, trompeuse ou nuisible.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">3. Espace artiste</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Chaque artiste reste responsable du contenu qu’il publie : titres, descriptions,
              images, prix, disponibilité, et plus largement de toute information liée à ses
              œuvres. L’artiste garantit disposer des droits nécessaires sur les visuels,
              créations et contenus mis en ligne.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">4. Commandes</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Lorsqu’un acheteur valide une commande sur La Toile Collective, celle-ci est
              enregistrée puis traitée via les outils techniques de la plateforme. Les commandes
              sont soumises à validation du paiement. Une fois confirmée, la commande entre dans
              le flux de traitement et de fabrication applicable à l’œuvre concernée.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">5. Prix</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Les prix affichés sur le site sont indiqués en euros, sauf mention contraire. Ils
              sont définis dans l’environnement de la plateforme et peuvent inclure, selon le cas,
              les frais liés à la fabrication, à la préparation et à la livraison. La Toile
              Collective se réserve le droit d’ajuster l’affichage ou la présentation des prix en
              cas d’erreur manifeste.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">6. Paiement</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Les paiements sont effectués via des solutions sécurisées de prestataires tiers.
              La Toile Collective ne stocke pas les données bancaires complètes des utilisateurs.
              Toute commande n’est considérée comme effective qu’après confirmation du paiement.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">7. Fabrication et livraison</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Certaines œuvres peuvent être produites à la demande. Les délais de traitement,
              de préparation et de livraison peuvent varier selon la nature de l’œuvre, le lieu
              de destination et les contraintes logistiques. La plateforme met tout en œuvre pour
              assurer une expérience fluide, mais ne peut garantir l’absence absolue de retard
              indépendant de sa volonté.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">8. Propriété intellectuelle</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Les œuvres, visuels, textes, logos, éléments graphiques et contenus présents sur
              La Toile Collective sont protégés par le droit de la propriété intellectuelle.
              Toute reproduction, diffusion, extraction ou utilisation non autorisée est interdite,
              sauf accord préalable du titulaire des droits concerné.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">9. Responsabilités</h2>
            <p className="mt-3 leading-8 text-slate-600">
              La Toile Collective s’efforce d’assurer l’accessibilité, la stabilité et la qualité
              de sa plateforme, mais ne peut être tenue responsable d’éventuelles interruptions,
              erreurs techniques, indisponibilités temporaires ou conséquences liées à un usage
              inadapté du site par l’utilisateur.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">10. Suspension ou suppression de compte</h2>
            <p className="mt-3 leading-8 text-slate-600">
              La plateforme se réserve le droit de suspendre, limiter ou supprimer un compte en
              cas de non-respect des présentes conditions, de fraude, d’atteinte aux droits d’un
              tiers, ou d’usage contraire à l’esprit et à la sécurité du site.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">11. Modification des conditions</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Les présentes conditions peuvent être modifiées à tout moment afin de refléter
              l’évolution du site, de ses services ou de son cadre juridique. La version en ligne
              au moment de la consultation fait foi.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">12. Contact</h2>
            <p className="mt-3 leading-8 text-slate-600">
              Pour toute question relative aux présentes conditions, vous pouvez contacter
              La Toile Collective à l’adresse suivante :{" "}
              <span className="font-medium text-slate-800">contact@latoilecollective.com</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}