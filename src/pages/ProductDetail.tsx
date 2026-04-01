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
  Truck,
  ShieldCheck,
  Palette,
  PackageCheck,
  Frame,
  Star,
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
    return "Une création idéale pour apporter du caractère, de la chaleur visuelle et une présence forte à un salon, un bureau ou un intérieur contemporain.";
  }

  if (normalized.includes("photographie")) {
    return "Une œuvre parfaite pour insuffler élégance, profondeur et atmosphère à un espace moderne ou raffiné.";
  }

  if (normalized.includes("sculpture")) {
    return "Une pièce pensée pour devenir un point focal sophistiqué et donner du relief à un intérieur soigné.";
  }

  if (normalized.includes("dessin")) {
    return "Une création subtile et expressive, parfaite pour enrichir un espace avec style, sensibilité et personnalité.";
  }

  return "Une œuvre pensée pour trouver naturellement sa place dans un intérieur élégant, vivant et inspiré.";
}

function getCategoryLabel(category: string) {
  const normalized = String(category || "").toLowerCase();

  if (normalized.includes("peinture")) return "Tirage d’art premium";
  if (normalized.includes("photographie")) return "Photographie imprimée premium";
  if (normalized.includes("sculpture")) return "Œuvre de décoration premium";
  if (normalized.includes("dessin")) return "Dessin imprimé premium";
  return "Œuvre imprimée premium";
}

function getSeoTitle(product: Product) {
  return `${product.title} | ${product.category} premium | La Toile Collective`;
}

function getSeoDescription(product: Product) {
  const baseDescription =
    product.description?.trim() ||
    "Une œuvre conçue pour apporter présence, élégance et singularité à votre espace.";

  return `${product.title} – ${product.category}. ${baseDescription} Produit physique premium, fabrication à la demande et livraison directe.`;
}

function upsertMetaByName(name: string, content: string) {
  let element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertMetaByProperty(property: string, content: string) {
  let element = document.querySelector(
    `meta[property="${property}"]`
  ) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertCanonical(url: string) {
  let element = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", url);
}

function upsertJsonLd(id: string, data: Record<string, unknown>) {
  let element = document.getElementById(id) as HTMLScriptElement | null;

  if (!element) {
    element = document.createElement("script");
    element.type = "application/ld+json";
    element.id = id;
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
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

  useEffect(() => {
    if (!product) {
      document.title = "Produit | La Toile Collective";
      return;
    }

    const title = getSeoTitle(product);
    const description = getSeoDescription(product);
    const canonicalUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/product/${product.id}`
        : `/product/${product.id}`;
    const imageUrl = product.images?.[0] || "";

    document.title = title;
    upsertMetaByName("description", description);
    upsertCanonical(canonicalUrl);

    upsertMetaByProperty("og:title", title);
    upsertMetaByProperty("og:description", description);
    upsertMetaByProperty("og:type", "product");
    upsertMetaByProperty("og:url", canonicalUrl);

    if (imageUrl) {
      upsertMetaByProperty("og:image", imageUrl);
    }

    upsertMetaByName("twitter:card", "summary_large_image");
    upsertMetaByName("twitter:title", title);
    upsertMetaByName("twitter:description", description);

    if (imageUrl) {
      upsertMetaByName("twitter:image", imageUrl);
    }

    const productSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description,
      image: product.images || [],
      category: product.category,
      sku: String(product.id),
      brand: {
        "@type": "Brand",
        name: "La Toile Collective",
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: product.price.toFixed(2),
        availability:
          product.stock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
        url: canonicalUrl,
      },
    };

    const breadcrumbSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Accueil",
          item:
            typeof window !== "undefined"
              ? `${window.location.origin}/`
              : "/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Galerie",
          item:
            typeof window !== "undefined"
              ? `${window.location.origin}/gallery`
              : "/gallery",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: product.title,
          item: canonicalUrl,
        },
      ],
    };

    upsertJsonLd("product-jsonld", productSchema);
    upsertJsonLd("breadcrumb-jsonld", breadcrumbSchema);
  }, [product]);

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
  const categoryLabel = product ? getCategoryLabel(product.category) : "Œuvre imprimée premium";

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
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setIsImageModalOpen(true)}
                    className="block w-full cursor-zoom-in rounded-2xl bg-slate-100"
                    aria-label="Agrandir l'image"
                  >
                    <div className="flex h-[600px] items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                      <img
                        src={mainImage}
                        alt={`${product.title} - ${product.category} - œuvre d’art premium`}
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
                            alt={`${product.title} ${idx + 1} - vue ${idx + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
                  <div className="mb-3 inline-flex items-center gap-2 text-amber-800">
                    <Palette className="h-4 w-4" />
                    <span className="text-sm font-semibold">Ce que vous voyez devient une pièce réelle</span>
                  </div>

                  <p className="text-sm leading-7 text-slate-700">
                    Cette création n’est pas vendue comme un simple visuel numérique. Elle est destinée
                    à être produite en version physique premium, avec une finition soignée et une
                    présence pensée pour l’intérieur.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-[600px] items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300">
                <span className="text-slate-500">Pas d&apos;image disponible</span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
              <Sparkles className="h-4 w-4" />
              {categoryLabel}
            </div>

            <div>
              <h1 className="mb-3 text-4xl font-bold text-slate-900">{product.title}</h1>

              <p className="text-lg leading-relaxed text-slate-600">
                {product.description ||
                  "Une œuvre conçue pour apporter présence, élégance et singularité à votre espace."}
              </p>

              <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-sm font-medium leading-7 text-slate-800">{projectionText}</p>
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

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-2 text-5xl font-bold text-amber-600">
                {product.price.toFixed(2)}€
              </p>

              <p className="text-base font-medium text-slate-800">
                Œuvre imprimée sur support premium, fabriquée à la demande
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">🖼️ Produit physique, pas un fichier numérique</div>
                <div className="rounded-xl bg-slate-50 p-3">🏭 Production professionnelle via notre atelier partenaire</div>
                <div className="rounded-xl bg-slate-50 p-3">📦 Emballage protégé pour une réception soignée</div>
                <div className="rounded-xl bg-slate-50 p-3">🚚 Livraison directement au client final</div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {product.stock > 0 ? "Disponible à la commande" : "Rupture temporaire"}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1.5">
                  Quantité disponible : <span className="font-semibold">{product.stock}</span>
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex items-center gap-2 text-amber-700">
                <PackageCheck className="h-4 w-4" />
                <span className="text-sm font-semibold">Ce que vous recevez</span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Impression premium</p>
                  <p className="mt-1 leading-6 text-slate-600">
                    Une reproduction haut de gamme pensée pour respecter la présence visuelle de l’œuvre.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Fabrication à la demande</p>
                  <p className="mt-1 leading-6 text-slate-600">
                    Chaque commande est lancée après achat pour garantir une exécution soignée.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Finition premium</p>
                  <p className="mt-1 leading-6 text-slate-600">
                    Rendu propre, présence décorative forte et sensation de pièce choisie avec exigence.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Livraison directe</p>
                  <p className="mt-1 leading-6 text-slate-600">
                    Le produit fini est expédié directement au client avec un parcours sécurisé.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-6">
              <div className="mb-3 inline-flex items-center gap-2 text-amber-700">
                <BadgeCheck className="h-4 w-4" />
                <span className="text-sm font-semibold">Pourquoi cette œuvre séduit</span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div className="rounded-xl bg-white/80 p-3">Présence visuelle forte et élégante</div>
                <div className="rounded-xl bg-white/80 p-3">Pensée pour sublimer un intérieur</div>
                <div className="rounded-xl bg-white/80 p-3">Impression haut de gamme, fidèle et soignée</div>
                <div className="rounded-xl bg-white/80 p-3">Expérience d’achat fluide, crédible et premium</div>
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

            <div className="space-y-3 pt-2">
              <button
                className="w-full rounded-xl bg-amber-600 px-4 py-3 text-white transition hover:bg-amber-700 disabled:opacity-60"
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart}
              >
                <span className="inline-flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {isOutOfStock
                    ? "Rupture de stock"
                    : addingToCart
                    ? "Ajout..."
                    : "Ajouter cette œuvre au panier"}
                </span>
              </button>

              <button
                className="w-full rounded-xl border border-slate-300 px-4 py-3 transition hover:bg-slate-100 disabled:opacity-60"
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
                className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-center transition hover:bg-slate-100"
              >
                Voir mes favoris
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Une œuvre prête à habiter votre espace
              </h2>

              <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <Frame className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Présence décorative réelle</p>
                    <p className="mt-1 leading-6 text-slate-600">
                      Vous n’achetez pas seulement une image, mais une pièce pensée pour être vue, ressentie et intégrée à un intérieur.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <Star className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Finition premium</p>
                    <p className="mt-1 leading-6 text-slate-600">
                      Le rendu final est conçu pour offrir plus de profondeur, de tenue visuelle et de valeur perçue.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <Truck className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Livraison suivie</p>
                    <p className="mt-1 leading-6 text-slate-600">
                      Votre commande suit un parcours clair, sécurisé et pensé pour arriver dans de bonnes conditions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Achat en confiance</p>
                    <p className="mt-1 leading-6 text-slate-600">
                      Paiement sécurisé, plateforme structurée et expérience pensée pour rassurer autant les acheteurs que les artistes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                À propos de cette œuvre
              </h2>

              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <span>Catégorie :</span>
                  <span className="text-right font-semibold text-slate-900">{product.category}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Disponibilité :</span>
                  <span className="text-right font-semibold text-slate-900">
                    {product.stock > 0 ? "Disponible à la commande" : "Rupture"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Format de vente :</span>
                  <span className="text-right font-semibold text-slate-900">
                    Produit physique premium
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Fabrication :</span>
                  <span className="text-right font-semibold text-slate-900">
                    À la demande
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Statut :</span>
                  <span className="text-right font-semibold text-slate-900">
                    {product.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>

                {product.createdAt && (
                  <div className="flex justify-between gap-4">
                    <span>Créée le :</span>
                    <span className="text-right font-semibold text-slate-900">
                      {new Date(product.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Bon à savoir avant achat
              </h2>

              <div className="space-y-3 text-sm leading-7 text-slate-600">
                <p>
                  Cette œuvre est proposée dans une logique d’expérience premium : rendu soigné,
                  fabrication à la demande et réception pensée pour donner plus de présence à la
                  création choisie.
                </p>

                <p>
                  Le prix correspond au produit fini, à sa qualité de fabrication, à sa préparation
                  et à son parcours de livraison — pas à un simple affichage numérique.
                </p>

                <p>
                  La plateforme rassemble plusieurs artistes. Chaque œuvre conserve son univers,
                  tout en bénéficiant d’un cadre de présentation, de fabrication et d’achat plus
                  clair et plus rassurant.
                </p>

                <Link
                  href="/quality"
                  className="inline-flex items-center gap-2 font-semibold text-amber-700 hover:text-amber-800"
                >
                  En savoir plus sur la qualité & fabrication
                </Link>
              </div>
            </div>

            <div className="sr-only">
              Acheter {product.title}, {product.category} premium, produit physique imprimé, fabrication
              à la demande, livraison directe et expérience d’achat sécurisée sur La Toile Collective.
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
                alt={`${product.title} - vue agrandie`}
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