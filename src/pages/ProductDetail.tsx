import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ShoppingCart,
  ArrowLeft,
  Heart,
  X,
  BadgeCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Product = {
  id: number;
  artistId: number | null;
  title: string;
  description: string | null;
  price: number;
  category: string;
  images: string[] | null;
  keywords: string[] | null;
  stock: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ToastType = "success" | "error" | "info";

type ToastState = {
  visible: boolean;
  message: string;
  type: ToastType;
};

function getCategoryProjection(category: string) {
  const normalized = String(category || "").toLowerCase();

  if (normalized.includes("peinture")) {
    return "Parfaite pour donner du caractère à un salon, un bureau ou un intérieur contemporain.";
  }

  if (normalized.includes("photographie")) {
    return "Idéale pour apporter présence visuelle, élégance et profondeur à un espace moderne.";
  }

  if (normalized.includes("sculpture")) {
    return "Une pièce forte pour créer un point focal raffiné dans un intérieur soigné.";
  }

  if (normalized.includes("dessin")) {
    return "Une création subtile pour enrichir un espace avec sensibilité, style et personnalité.";
  }

  return "Une œuvre pensée pour trouver naturellement sa place dans un intérieur élégant et inspiré.";
}

export default function ProductDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const id = Number(params.id);

  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "info",
  });

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({
      visible: true,
      message,
      type,
    });
  };

  const hideToast = () => {
    setToast((prev) => ({
      ...prev,
      visible: false,
    }));
  };

  useEffect(() => {
    if (!toast.visible) return;

    const timeout = window.setTimeout(() => {
      hideToast();
    }, 2600);

    return () => window.clearTimeout(timeout);
  }, [toast.visible]);

  async function resolveCurrentUserId(options?: { redirectToAuth?: boolean }) {
    const shouldRedirect = options?.redirectToAuth ?? true;

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      if (shouldRedirect) {
        setLocation("/auth");
      }
      return null;
    }

    const authUser = authData.user;

    const { data: appUser, error: appUserError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", authUser.email ?? "")
      .maybeSingle();

    if (appUserError) {
      showToast(`Erreur utilisateur : ${appUserError.message}`, "error");
      return null;
    }

    if (!appUser) {
      showToast("Profil utilisateur introuvable.", "error");
      return null;
    }

    return Number(appUser.id);
  }

  useEffect(() => {
    async function fetchProduct() {
      if (!id || Number.isNaN(id)) {
        setProduct(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Erreur chargement produit:", error);
        setProduct(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setProduct(null);
        setLoading(false);
        return;
      }

      setProduct({
        id: data.id,
        artistId: data.artistId ?? null,
        title: data.title,
        description: data.description ?? "",
        price: Number(data.price ?? 0),
        category: data.category ?? "Autre",
        images: Array.isArray(data.images) ? data.images : [],
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        stock: Number(data.stock ?? 0),
        isActive: Boolean(data.isActive),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });

      setSelectedImageIndex(0);
      setLoading(false);
    }

    void fetchProduct();
  }, [id]);

  useEffect(() => {
    async function fetchFavoriteStatus() {
      if (!product) return;

      const currentUserId = await resolveCurrentUserId({ redirectToAuth: false });
      if (!currentUserId) {
        setIsFavorite(false);
        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("userId", currentUserId)
        .eq("productId", product.id)
        .maybeSingle();

      if (error) {
        console.error("Erreur chargement favoris:", error);
        return;
      }

      setIsFavorite(!!data);
    }

    void fetchFavoriteStatus();
  }, [product]);

  useEffect(() => {
    if (!isImageModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsImageModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isImageModalOpen]);

  const handleToggleFavorite = async () => {
    if (!product) return;

    const currentUserId = await resolveCurrentUserId();
    if (!currentUserId) return;

    setFavoriteLoading(true);

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("userId", currentUserId)
        .eq("productId", product.id);

      if (error) {
        showToast(`Erreur favoris : ${error.message}`, "error");
        setFavoriteLoading(false);
        return;
      }

      setIsFavorite(false);
      setFavoriteLoading(false);
      showToast("Produit retiré des favoris.", "info");
      return;
    }

    const { error } = await supabase.from("favorites").insert([
      {
        userId: currentUserId,
        productId: product.id,
      },
    ]);

    if (error) {
      showToast(`Erreur favoris : ${error.message}`, "error");
      setFavoriteLoading(false);
      return;
    }

    setIsFavorite(true);
    setFavoriteLoading(false);
    showToast("Produit ajouté aux favoris.", "success");
  };

  const handleAddToCart = async () => {
    if (!product) return;

    const currentUserId = await resolveCurrentUserId();
    if (!currentUserId) return;

    setAddingToCart(true);

    const { data: existingItem, error: existingError } = await supabase
      .from("cartItems")
      .select("*")
      .eq("userId", currentUserId)
      .eq("productId", product.id)
      .maybeSingle();

    if (existingError) {
      console.error("Erreur vérification panier:", existingError);
      showToast(`Erreur panier : ${existingError.message}`, "error");
      setAddingToCart(false);
      return;
    }

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      const { error: updateError } = await supabase
        .from("cartItems")
        .update({ quantity: newQuantity })
        .eq("id", existingItem.id);

      if (updateError) {
        console.error("Erreur mise à jour panier:", updateError);
        showToast(`Erreur panier : ${updateError.message}`, "error");
        setAddingToCart(false);
        return;
      }

      setAddingToCart(false);
      setLocation("/cart");
      return;
    }

    const { error: insertError } = await supabase.from("cartItems").insert([
      {
        userId: currentUserId,
        productId: product.id,
        quantity,
      },
    ]);

    if (insertError) {
      console.error("Erreur ajout panier:", insertError);
      showToast(`Erreur ajout panier : ${insertError.message}`, "error");
      setAddingToCart(false);
      return;
    }

    setAddingToCart(false);
    setLocation("/cart");
  };

  const images = useMemo(() => (Array.isArray(product?.images) ? product!.images : []), [product]);
  const keywords = useMemo(
    () => (Array.isArray(product?.keywords) ? product!.keywords : []),
    [product]
  );

  const mainImage = images[selectedImageIndex] || images[0] || "";
  const isOutOfStock = !product || product.stock <= 0;
  const projectionText = product ? getCategoryProjection(product.category) : "";

  const toastStyles =
    toast.type === "success"
      ? {
          wrapper: "border-emerald-200 bg-white text-slate-900 shadow-2xl",
          iconWrap: "bg-emerald-100 text-emerald-700",
          progress: "bg-emerald-500",
        }
      : toast.type === "error"
      ? {
          wrapper: "border-red-200 bg-white text-slate-900 shadow-2xl",
          iconWrap: "bg-red-100 text-red-700",
          progress: "bg-red-500",
        }
      : {
          wrapper: "border-amber-200 bg-white text-slate-900 shadow-2xl",
          iconWrap: "bg-amber-100 text-amber-700",
          progress: "bg-amber-500",
        };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Chargement...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="mb-4 text-lg text-slate-600">Produit non trouvé</p>
        <Link
          href="/gallery"
          className="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
        >
          Retour à la galerie
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {toast.visible && (
        <div className="pointer-events-none fixed right-4 top-4 z-[100] w-full max-w-sm">
          <div
            className={`pointer-events-auto overflow-hidden rounded-2xl border ${toastStyles.wrapper} animate-in slide-in-from-top-2 fade-in duration-300`}
          >
            <div className="flex items-start gap-3 p-4">
              <div className={`mt-0.5 rounded-full p-2 ${toastStyles.iconWrap}`}>
                {toast.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : toast.type === "error" ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <Info className="h-5 w-5" />
                )}
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {toast.type === "success"
                    ? "Succès"
                    : toast.type === "error"
                    ? "Erreur"
                    : "Information"}
                </p>
                <p className="mt-1 text-sm text-slate-600">{toast.message}</p>
              </div>

              <button
                type="button"
                onClick={hideToast}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fermer la notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-1 w-full bg-slate-100">
              <div
                className={`h-full w-full origin-left animate-[shrink_2.6s_linear_forwards] ${toastStyles.progress}`}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <Link
            href="/gallery"
            className="mb-4 flex items-center gap-2 text-amber-600 hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la galerie
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            {images.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setIsImageModalOpen(true)}
                    className="block w-full cursor-zoom-in rounded-xl bg-slate-100"
                  >
                    <div className="flex h-[600px] items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                      <img
                        src={mainImage}
                        alt={product.title}
                        loading="eager"
                        decoding="async"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </button>
                </div>

                {images.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {images.slice(0, 5).map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`rounded-xl border-2 bg-white p-1 transition ${
                          selectedImageIndex === idx
                            ? "border-amber-600"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                          <img
                            src={img}
                            alt={`${product.title} ${idx + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[600px] items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300">
                <span className="text-slate-500">Pas d&apos;image disponible</span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="inline-block">
              <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900">
                {product.category}
              </span>
            </div>

            <div>
              <h1 className="mb-3 text-4xl font-bold text-slate-900">{product.title}</h1>

              <p className="text-lg leading-relaxed text-slate-600">
                {product.description ||
                  "Une œuvre conçue pour apporter présence, élégance et singularité à votre espace."}
              </p>

              <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-sm font-medium text-slate-800">{projectionText}</p>
              </div>
            </div>

            {keywords.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Mots-clés
                </h2>

                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, index) => {
                    const cleanKeyword = String(keyword).trim();
                    if (!cleanKeyword) return null;

                    return (
                      <Link
                        key={`${product.id}-${cleanKeyword}-${index}`}
                        href={`/gallery?search=${encodeURIComponent(cleanKeyword)}`}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-amber-100 hover:text-amber-900"
                      >
                        #{cleanKeyword}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-y border-slate-200 py-6">
              <p className="mb-2 text-5xl font-bold text-amber-600">
                {product.price.toFixed(2)}€
              </p>
              <p className="text-slate-600">
                Stock disponible : <span className="font-semibold">{product.stock}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 inline-flex items-center gap-2 text-amber-700">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">Pourquoi cette œuvre séduit</span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  Présence visuelle forte et élégante
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  Parfaite pour enrichir un intérieur soigné
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  Œuvre premium pensée pour durer
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  Achat simple, fabrication qualitative
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-900">Quantité</label>

              <div className="flex items-center gap-3">
                <button
                  className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-100"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  −
                </button>

                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.max(
                        1,
                        Math.min(product.stock || 1, Number(e.target.value) || 1)
                      )
                    )
                  }
                  className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-center"
                />

                <button
                  className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-100"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5">
              <div className="mb-3 inline-flex items-center gap-2 text-amber-700">
                <BadgeCheck className="h-4 w-4" />
                <span className="text-sm font-semibold">Qualité & expérience</span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div>Impression haut de gamme</div>
                <div>Production à la demande</div>
                <div>Finitions premium</div>
                <div>Livraison sécurisée</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                className="w-full rounded-lg bg-amber-600 px-4 py-3 text-white hover:bg-amber-700 disabled:opacity-60"
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart}
              >
                <span className="inline-flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {isOutOfStock
                    ? "Rupture de stock"
                    : addingToCart
                    ? "Ajout..."
                    : "Ajouter au panier"}
                </span>
              </button>

              <button
                className="w-full rounded-lg border border-slate-300 px-4 py-3 hover:bg-slate-100 disabled:opacity-60"
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
              >
                <span className="inline-flex items-center">
                  <Heart
                    className={`mr-2 h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
                  />
                  {favoriteLoading
                    ? "Chargement..."
                    : isFavorite
                    ? "Retiré des favoris"
                    : "Ajouter aux favoris"}
                </span>
              </button>

              <Link
                href="/favorites"
                className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-center hover:bg-slate-100"
              >
                Voir mes favoris
              </Link>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                À propos de cette œuvre
              </h2>

              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Catégorie :</span>
                  <span className="font-semibold text-slate-900">{product.category}</span>
                </div>

                <div className="flex justify-between">
                  <span>Disponibilité :</span>
                  <span className="font-semibold text-slate-900">
                    {product.stock > 0 ? "En stock" : "Rupture"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Statut :</span>
                  <span className="font-semibold text-slate-900">
                    {product.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>

                {product.createdAt && (
                  <div className="flex justify-between">
                    <span>Créée le :</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(product.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Bon à savoir avant achat
              </h2>

              <div className="space-y-3 text-sm leading-7 text-slate-600">
                <p>
                  Cette œuvre s’inscrit dans une expérience d’achat premium pensée pour offrir
                  un rendu soigné, une présentation fidèle et une réception de qualité.
                </p>
                <p>
                  Chaque commande est traitée avec attention afin de garantir une expérience
                  fluide, du choix de l’œuvre jusqu’à sa livraison.
                </p>
                <Link
                  href="/quality"
                  className="inline-flex items-center gap-2 font-semibold text-amber-700 hover:text-amber-800"
                >
                  En savoir plus sur la qualité & fabrication
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isImageModalOpen && mainImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative flex w-full max-w-6xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsImageModalOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-900 hover:bg-white"
              aria-label="Fermer l'image"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex max-h-[90vh] w-full items-center justify-center rounded-xl bg-slate-100 p-4 shadow-2xl">
              <img
                src={mainImage}
                alt={product.title}
                loading="eager"
                decoding="async"
                className="max-h-[85vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}