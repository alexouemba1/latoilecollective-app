import { useMemo, useState } from "react";
import { Link } from "wouter";
import { BarChart3, Users, ShoppingCart, AlertCircle, ArrowLeft } from "lucide-react";

type Product = {
  id: number;
  title: string;
  category: string;
  price: number;
  isActive: boolean;
};

const DEMO_PRODUCTS: Product[] = [
  { id: 1, title: "Crépuscule sur toile", category: "Peinture", price: 250, isActive: true },
  { id: 2, title: "Silence minéral", category: "Sculpture", price: 420, isActive: true },
  { id: 3, title: "Fragments de lumière", category: "Photographie", price: 90, isActive: false },
  { id: 4, title: "Ligne vive", category: "Dessin", price: 140, isActive: true },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "products">("overview");
  const isAdmin = true;

  const totalProducts = DEMO_PRODUCTS.length;
  const activeProducts = useMemo(
    () => DEMO_PRODUCTS.filter((p) => p.isActive).length,
    []
  );
  const pendingProducts = useMemo(
    () => DEMO_PRODUCTS.filter((p) => !p.isActive).length,
    []
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <div className="mb-4 flex items-center gap-2 text-red-900">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-xl font-bold">Accès refusé</h2>
            </div>
            <p className="mb-4 text-red-800">
              Vous n&apos;avez pas les permissions pour accéder à cette page.
            </p>
            <Link
              href="/"
              className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-100"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 text-amber-600 hover:text-amber-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l&apos;accueil
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord admin</h1>
          <p className="mt-1 text-slate-600">Gestion de la plateforme et modération</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8 flex gap-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-4 px-4 font-semibold transition-colors ${
              activeTab === "overview"
                ? "border-b-2 border-amber-600 text-amber-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="mr-2 inline h-5 w-5" />
            Aperçu
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`pb-4 px-4 font-semibold transition-colors ${
              activeTab === "products"
                ? "border-b-2 border-amber-600 text-amber-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShoppingCart className="mr-2 inline h-5 w-5" />
            Produits
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`pb-4 px-4 font-semibold transition-colors ${
              activeTab === "users"
                ? "border-b-2 border-amber-600 text-amber-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="mr-2 inline h-5 w-5" />
            Utilisateurs
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-medium text-slate-600">Total produits</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{totalProducts}</p>
              <p className="mt-2 text-xs text-slate-500">{activeProducts} actifs</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-medium text-slate-600">Produits actifs</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{activeProducts}</p>
              <p className="mt-2 text-xs text-slate-500">Visibles sur la galerie</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-medium text-slate-600">En attente de modération</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{pendingProducts}</p>
              <p className="mt-2 text-xs text-slate-500">À examiner</p>
            </div>
          </div>
        )}

        {activeTab === "products" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-2 text-xl font-semibold text-slate-900">Gestion des produits</h2>
            <p className="mb-6 text-slate-600">Modérez et gérez les annonces d&apos;œuvres d&apos;art.</p>

            <div className="space-y-4">
              {DEMO_PRODUCTS.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{product.title}</p>
                    <p className="text-sm text-slate-600">{product.category}</p>
                    <p className="mt-1 text-sm font-semibold text-amber-600">
                      {product.price.toFixed(2)}€
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      product.isActive
                        ? "bg-green-100 text-green-900"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {product.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-2 text-xl font-semibold text-slate-900">Gestion des utilisateurs</h2>
            <p className="py-8 text-center text-slate-600">
              Fonctionnalité à venir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}