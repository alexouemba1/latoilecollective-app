import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Palette,
  ShoppingCart,
  TrendingUp,
  Users,
  Heart,
  Sparkles,
  ArrowUpRight,
  BadgeCheck,
  Truck,
  CheckCircle2,
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
  stock: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ArtistProfile = {
  id: number;
  userId: number;
  bio: string | null;
  profileImage: string | null;
  isVerified?: boolean | null;
  isActive?: boolean | null;
  profileImagePositionX?: number | null;
  profileImagePositionY?: number | null;
};

type FeaturedArtist = {
  id: number;
  name: string;
  bio: string;
  profileImage: string;
  isVerified: boolean;
  profileImagePositionX: number;
  profileImagePositionY: number;
};

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1400&q=80";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredArtists, setFeaturedArtists] = useState<FeaturedArtist[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    }

    async function fetchFeaturedProducts() {
      setLoadingFeatured(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("isActive", true)
        .order("createdAt", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Erreur chargement œuvres accueil:", error);
        setFeaturedProducts([]);
        setLoadingFeatured(false);
        return;
      }

      const normalized: Product[] = (data || []).map((item: any) => ({
        id: item.id,
        artistId: item.artistId ?? null,
        title: item.title,
        description: item.description ?? "",
        price: Number(item.price ?? 0),
        category: item.category ?? "Autre",
        images: Array.isArray(item.images) ? item.images : [],
        stock: Number(item.stock ?? 0),
        isActive: Boolean(item.isActive),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      setFeaturedProducts(normalized);
      setLoadingFeatured(false);
    }

    async function fetchFeaturedArtists() {
      setLoadingArtists(true);

      const { data: artistsData, error: artistsError } = await supabase
        .from("artists")
        .select(
          "id, userId, bio, profileImage, isVerified, isActive, profileImagePositionX, profileImagePositionY"
        )
        .eq("isActive", true)
        .order("id", { ascending: false })
        .limit(6);

      if (artistsError) {
        console.error("Erreur chargement artistes accueil:", artistsError);
        setFeaturedArtists([]);
        setLoadingArtists(false);
        return;
      }

      const normalizedArtists: ArtistProfile[] = (artistsData || []).map((artist: any) => ({
        id: Number(artist.id),
        userId: Number(artist.userId),
        bio: artist.bio ?? "",
        profileImage: artist.profileImage ?? "",
        isVerified: Boolean(artist.isVerified),
        isActive: artist.isActive ?? true,
        profileImagePositionX: Number(artist.profileImagePositionX ?? 50),
        profileImagePositionY: Number(artist.profileImagePositionY ?? 50),
      }));

      if (normalizedArtists.length === 0) {
        setFeaturedArtists([]);
        setLoadingArtists(false);
        return;
      }

      const userIds = [...new Set(normalizedArtists.map((artist) => artist.userId))];

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", userIds);

      if (usersError) {
        console.error("Erreur chargement users accueil:", usersError);
        setFeaturedArtists([]);
        setLoadingArtists(false);
        return;
      }

      const userMap = new Map<number, { name?: string | null; email?: string | null }>();
      for (const user of usersData || []) {
        userMap.set(Number(user.id), {
          name: user.name ?? "",
          email: user.email ?? "",
        });
      }

      const formattedArtists: FeaturedArtist[] = normalizedArtists
        .map((artist) => {
          const linkedUser = userMap.get(artist.userId);
          const displayName = linkedUser?.name || linkedUser?.email || "Artiste";

          return {
            id: artist.id,
            name: displayName,
            bio:
              artist.bio && artist.bio !== "EMPTY"
                ? artist.bio
                : "Découvrez un univers artistique singulier, exposé avec soin sur La Toile Collective.",
            profileImage: artist.profileImage || "",
            isVerified: Boolean(artist.isVerified),
            profileImagePositionX: Number(artist.profileImagePositionX ?? 50),
            profileImagePositionY: Number(artist.profileImagePositionY ?? 50),
          };
        })
        .slice(0, 3);

      setFeaturedArtists(formattedArtists);
      setLoadingArtists(false);
    }

    checkAuth();
    fetchFeaturedProducts();
    fetchFeaturedArtists();
  }, []);

  const heroArtwork = featuredProducts[0] ?? null;

  const heroImage = useMemo(() => {
    return heroArtwork?.images?.[0] || DEFAULT_HERO_IMAGE;
  }, [heroArtwork]);

  useEffect(() => {
    setHeroImageFailed(false);
  }, [heroImage]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 md:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Palette className="h-7 w-7 flex-shrink-0 text-amber-600 md:h-8 md:w-8" />
              <span className="truncate text-xl font-bold tracking-tight md:text-2xl">
                La Toile Collective
              </span>
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <Link
                href="/gallery"
                className="rounded-lg px-4 py-2 text-slate-700 transition hover:bg-slate-100"
              >
                Galerie
              </Link>

              {isAuthenticated && (
                <Link
                  href="/favorites"
                  className="inline-flex items-center rounded-lg px-4 py-2 text-slate-700 transition hover:bg-slate-100"
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Favoris
                </Link>
              )}

              <Link
                href={isAuthenticated ? "/seller-dashboard" : "/auth"}
                className="rounded-lg px-4 py-2 text-slate-700 transition hover:bg-slate-100"
              >
                Espace vendeur
              </Link>

              <Link
                href="/cart"
                className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-100"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Panier
              </Link>

              {isAuthenticated ? (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-800"
                >
                  Se déconnecter
                </button>
              ) : (
                <Link
                  href="/auth"
                  className="rounded-lg bg-amber-600 px-4 py-2 text-white transition hover:bg-amber-700"
                >
                  Se connecter
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 lg:hidden">
              <Link
                href="/gallery"
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700"
              >
                Galerie
              </Link>

              <Link
                href="/cart"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Panier
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-100 via-white to-amber-50">
        <div className="mx-auto max-w-7xl px-4 py-4 md:py-10">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800 backdrop-blur-sm md:mb-3 md:px-4 md:py-2 md:text-sm md:normal-case md:tracking-normal">
                <Sparkles className="h-4 w-4" />
                Galerie premium multi-artistes
              </div>

              <h1 className="max-w-3xl text-3xl font-bold leading-[1.03] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                Des œuvres uniques.
                <span className="block text-amber-600">Prêtes à habiter votre espace.</span>
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base md:mt-4 md:text-lg">
                Ici, le prix correspond au produit fini : une œuvre imprimée en version physique
                premium, fabriquée à la demande et livrée directement au client.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/gallery"
                  className="rounded-xl bg-slate-900 px-6 py-3 text-center text-white transition hover:bg-slate-800"
                >
                  Découvrir la galerie
                </Link>

                <Link
                  href={isAuthenticated ? "/seller-dashboard" : "/auth"}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-slate-800 transition hover:bg-slate-100"
                >
                  {isAuthenticated ? "Accéder à mon espace vendeur" : "Devenir artiste"}
                </Link>
              </div>
            </div>

            <div className="lg:justify-self-end">
              <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:rounded-[1.8rem] md:p-3">
                <div className="relative overflow-hidden rounded-[1.1rem] bg-slate-100 md:rounded-[1.4rem]">
                  {!heroImageFailed ? (
                    <img
                      src={heroImage}
                      alt={heroArtwork?.title || "Œuvre mise en avant"}
                      loading="eager"
                      decoding="async"
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="h-[240px] w-full object-cover object-center sm:h-[300px] md:h-[360px] lg:h-[420px]"
                      onError={() => setHeroImageFailed(true)}
                    />
                  ) : (
                    <div className="flex h-[240px] items-center justify-center bg-gradient-to-br from-slate-100 via-amber-50 to-orange-100 sm:h-[300px] md:h-[360px] lg:h-[420px]">
                      <div className="px-6 text-center">
                        <Palette className="mx-auto mb-4 h-14 w-14 text-amber-600/70" />
                        <p className="text-lg font-semibold text-slate-900 md:text-2xl">
                          Œuvre mise en avant
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent" />

                  <div className="absolute left-3 top-3">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 backdrop-blur-md md:text-xs">
                      Sélection curatoriale
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 md:text-xs">
                      {heroArtwork?.category ?? "Art contemporain"}
                    </p>

                    <h2 className="max-w-md text-xl font-bold text-white sm:text-2xl md:text-3xl">
                      {heroArtwork?.title ?? "Une œuvre pensée pour marquer le regard"}
                    </h2>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-white">
                      <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
                        {heroArtwork ? `${heroArtwork.price.toFixed(2)}€` : "Collection premium"}
                      </span>

                      <Link
                        href={heroArtwork ? `/product/${heroArtwork.id}` : "/gallery"}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white"
                      >
                        Voir l’œuvre
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <BadgeCheck className="h-4.5 w-4.5" />
              </div>
              <p className="font-semibold text-slate-900">Produit physique premium</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Une œuvre conçue pour exister pleinement dans l’espace.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <Truck className="h-4.5 w-4.5" />
              </div>
              <p className="font-semibold text-slate-900">Livraison directe</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Fabrication à la demande, préparation soignée, envoi sécurisé.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold md:text-4xl">Œuvres à découvrir</h2>
              <p className="mt-2 text-sm text-slate-600 md:text-base">
                Un aperçu des créations récemment publiées sur la plateforme.
              </p>
            </div>

            <Link
              href="/gallery"
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-100"
            >
              Voir toute la galerie
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="py-12 text-center text-slate-600">Chargement des œuvres...</div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {featuredProducts.slice(0, 3).map((product) => (
                <Link key={product.id} href={`/product/${product.id}`} className="block">
                  <div className="group h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                    {product.images && product.images.length > 0 ? (
                      <div className="relative h-64 overflow-hidden bg-slate-100 sm:h-72">
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          loading="lazy"
                          decoding="async"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 backdrop-blur-sm">
                          {product.category}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-64 items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 sm:h-72">
                        <span className="text-slate-500">Pas d&apos;image</span>
                      </div>
                    )}

                    <div className="p-5 md:p-6">
                      <h3 className="mb-2 text-xl font-semibold text-slate-900 md:text-2xl">
                        {product.title}
                      </h3>
                      <p className="min-h-[44px] text-sm text-slate-600 md:min-h-[52px] md:text-base">
                        {product.description ||
                          "Une œuvre sélectionnée pour sa présence et son caractère."}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-4 md:mt-5">
                        <div>
                          <p className="text-2xl font-bold text-amber-600">
                            {product.price.toFixed(2)}€
                          </p>
                          <p className="text-sm text-slate-500">Stock : {product.stock}</p>
                        </div>

                        <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition group-hover:bg-amber-50 group-hover:text-amber-700">
                          Voir l’œuvre
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center md:p-12">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Palette className="h-7 w-7" />
              </div>

              <h3 className="mb-3 text-2xl font-semibold text-slate-900">
                Exposez votre première œuvre
              </h3>

              <p className="mx-auto mb-6 max-w-2xl text-slate-600">
                La galerie publique est encore vide. Ajoutez une œuvre depuis votre espace vendeur
                pour commencer à construire une vitrine plus élégante, plus premium et plus crédible.
              </p>

              <Link
                href={isAuthenticated ? "/seller-dashboard" : "/auth"}
                className="inline-flex rounded-lg bg-slate-900 px-5 py-3 text-white transition hover:bg-slate-800"
              >
                {isAuthenticated ? "Ajouter une œuvre" : "Créer mon espace artiste"}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 max-w-3xl md:mb-10">
            <h2 className="text-2xl font-bold md:text-4xl">
              Une expérience pensée pour inspirer confiance
            </h2>
            <p className="mt-3 text-sm text-slate-600 md:text-base">
              Tout doit donner envie d’acheter sans bruit inutile : lisibilité, qualité perçue,
              simplicité, émotion et crédibilité.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 md:text-xl">
                1. Choisir une œuvre
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
                Parcourez une galerie conçue pour mettre l’image en valeur et laisser la place au
                coup de cœur.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 md:text-xl">
                2. Commander simplement
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
                Une expérience fluide, claire et rassurante, pensée pour éviter toute friction au
                moment de l’achat.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 md:text-xl">
                3. Recevoir avec plaisir
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
                La commande arrive comme une vraie pièce choisie avec soin, et non comme un simple
                produit impersonnel.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold md:text-4xl">Artistes en vedette</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
                Des profils singuliers, des univers affirmés, et une vitrine pensée pour faire
                rayonner leur travail avec plus de force.
              </p>
            </div>

            <Link
              href="/gallery"
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-100"
            >
              Explorer la plateforme
            </Link>
          </div>

          {loadingArtists ? (
            <div className="py-12 text-center text-slate-600">Chargement des artistes...</div>
          ) : featuredArtists.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {featuredArtists.map((artist) => (
                <Link key={artist.id} href={`/artist/${artist.id}`} className="block">
                  <div className="group h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="relative h-64 overflow-hidden bg-slate-100 sm:h-72">
                      {artist.profileImage ? (
                        <img
                          src={artist.profileImage}
                          alt={artist.name}
                          loading="lazy"
                          decoding="async"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          style={{
                            objectPosition: `${artist.profileImagePositionX}% ${artist.profileImagePositionY}%`,
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-200 to-amber-50">
                          <Palette className="h-14 w-14 text-amber-600/60" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

                      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="text-2xl font-bold text-white">{artist.name}</h3>
                          {artist.isVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                              <BadgeCheck className="h-3.5 w-3.5" />
                              Vérifié
                            </span>
                          ) : null}
                        </div>

                        <p className="text-sm text-white/80">Artiste sélectionné</p>
                      </div>
                    </div>

                    <div className="p-5 md:p-6">
                      <p className="min-h-[72px] text-sm leading-relaxed text-slate-600 line-clamp-4 md:min-h-[96px] md:text-base">
                        {artist.bio}
                      </p>

                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-700 md:mt-5">
                        Découvrir son univers
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-lg text-slate-600">Aucun artiste mis en avant pour le moment.</p>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-8 text-center text-2xl font-bold md:mb-12 md:text-4xl">
            Pourquoi choisir La Toile Collective ?
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg md:p-6">
              <Palette className="mb-3 h-8 w-8 text-amber-600" />
              <h3 className="mb-3 text-lg font-semibold md:text-xl">Pour les artistes</h3>
              <p className="text-sm text-slate-600 md:text-base">
                Publiez vos œuvres et présentez votre univers sans lourdeur technique.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg md:p-6">
              <ShoppingCart className="mb-3 h-8 w-8 text-amber-600" />
              <h3 className="mb-3 text-lg font-semibold md:text-xl">Paiements sécurisés</h3>
              <p className="text-sm text-slate-600 md:text-base">
                Commandes fluides, paiements fiables et expérience d’achat pensée pour rassurer
                acheteurs comme artistes.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg md:p-6">
              <Users className="mb-3 h-8 w-8 text-amber-600" />
              <h3 className="mb-3 text-lg font-semibold md:text-xl">Communauté</h3>
              <p className="text-sm text-slate-600 md:text-base">
                Rassembler artistes, collectionneurs et amateurs autour d&apos;une galerie vivante.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg md:p-6">
              <TrendingUp className="mb-3 h-8 w-8 text-amber-600" />
              <h3 className="mb-3 text-lg font-semibold md:text-xl">Croissance</h3>
              <p className="text-sm text-slate-600 md:text-base">
                Tableau de bord vendeur, gestion des œuvres et vision claire des revenus potentiels.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="overflow-hidden rounded-[1.35rem] bg-gradient-to-r from-slate-900 via-slate-800 to-amber-700 p-5 text-white shadow-xl md:rounded-[2rem] md:p-12">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-white/75">
                La Toile Collective
              </p>

              <h2 className="max-w-3xl text-2xl font-bold leading-tight sm:text-3xl md:text-5xl">
                Une galerie pensée pour donner plus de valeur à l’art, plus de confiance à l’achat,
                et plus de stature aux artistes.
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 md:mt-5 md:text-lg">
                Ici, on cherche moins à faire du bruit qu’à créer une vraie impression : émotion,
                élégance, présence et crédibilité.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-col">
              <Link
                href="/gallery"
                className="rounded-xl bg-white px-6 py-3 text-center text-slate-900 transition hover:bg-slate-100"
              >
                Voir les œuvres
              </Link>

              <Link
                href={isAuthenticated ? "/seller-dashboard" : "/auth"}
                className="rounded-xl border border-white/30 px-6 py-3 text-center text-white transition hover:bg-white/10"
              >
                {isAuthenticated ? "Accéder à mon espace vendeur" : "Créer mon espace artiste"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-950 py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4 font-bold">La Toile Collective</h3>
              <p className="text-sm text-slate-400">
                Une plateforme d’art pensée pour présenter, vendre et faire rayonner les œuvres avec
                plus d’élégance.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Liens</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="/gallery" className="hover:text-white">
                    Galerie
                  </Link>
                </li>
                <li>
                  <Link
                    href={isAuthenticated ? "/seller-dashboard" : "/auth"}
                    className="hover:text-white"
                  >
                    Espace vendeur
                  </Link>
                </li>
                {isAuthenticated && (
                  <li>
                    <Link href="/favorites" className="hover:text-white">
                      Favoris
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Légal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="/quality" className="hover:text-white">
                    Qualité & fabrication
                  </Link>
                </li>
                <li>
                  <Link href="/conditions" className="hover:text-white">
                    Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    Confidentialité
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Contact</h4>
              <Link
                href="/contact"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                contact@latoilecolective.com
              </Link>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2026 La Toile Collective. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}