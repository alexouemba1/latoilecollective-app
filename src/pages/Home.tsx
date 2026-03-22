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
  ShieldCheck,
  Truck,
  Frame,
  Star,
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

const DEFAULT_AMBIANCE_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredArtists, setFeaturedArtists] = useState<FeaturedArtist[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [ambianceImageFailed, setAmbianceImageFailed] = useState(false);

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
  const secondArtwork = featuredProducts[1] ?? null;
 

  const heroImage = useMemo(() => {
    return heroArtwork?.images?.[0] || DEFAULT_HERO_IMAGE;
  }, [heroArtwork]);

  const ambianceImage = useMemo(() => {
    return secondArtwork?.images?.[0] || DEFAULT_AMBIANCE_IMAGE;
  }, [secondArtwork]);

  useEffect(() => {
    setHeroImageFailed(false);
  }, [heroImage]);

  useEffect(() => {
    setAmbianceImageFailed(false);
  }, [ambianceImage]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Palette className="h-8 w-8 text-amber-600" />
            <span className="text-2xl font-bold tracking-tight">La Toile Collective</span>
          </div>

          <div className="hidden items-center gap-3 md:flex">
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

          <div className="md:hidden">
            <Link
              href="/gallery"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Galerie
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-amber-50" />
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-orange-200/25 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 py-20 lg:grid-cols-[0.92fr_1.08fr] lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-sm font-medium text-amber-800 backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              Art contemporain • impression premium • expérience soignée
            </div>

            <h1 className="max-w-2xl text-5xl font-bold leading-[1.02] tracking-tight lg:text-7xl">
              Des œuvres uniques.
              <span className="block text-amber-600">Prêtes à habiter votre espace.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 lg:text-xl">
              Découvrez une sélection d’artistes et d’œuvres imprimées avec exigence, pour une
              présence forte, élégante et durable dans les intérieurs qui aiment le caractère.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/gallery"
                className="rounded-xl bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800"
              >
                Découvrir la galerie
              </Link>

              <Link
                href={isAuthenticated ? "/seller-dashboard" : "/auth"}
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-slate-800 transition hover:bg-slate-100"
              >
                {isAuthenticated ? "Accéder à mon espace vendeur" : "Devenir artiste"}
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <p className="font-semibold text-slate-900">Qualité galerie</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Une présentation haut de gamme pensée pour valoriser l’œuvre avant tout.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                  <Truck className="h-5 w-5" />
                </div>
                <p className="font-semibold text-slate-900">Livraison suivie</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Une expérience fluide, du choix de l’œuvre jusqu’à sa réception.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-16 hidden h-44 w-44 rounded-full bg-amber-200/30 blur-3xl lg:block" />
            <div className="absolute -right-8 bottom-10 hidden h-52 w-52 rounded-full bg-orange-200/25 blur-3xl lg:block" />

            <div className="relative rounded-[2rem] border border-slate-200/90 bg-white p-4 shadow-[0_35px_90px_rgba(15,23,42,0.10)]">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_210px]">
                <div className="relative overflow-hidden rounded-[1.6rem] bg-slate-100">
                  {!heroImageFailed ? (
                    <img
                      src={heroImage}
                      alt={heroArtwork?.title || "Œuvre mise en avant"}
                      loading="eager"
                      decoding="async"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="h-[560px] w-full object-cover object-center transition-transform duration-700 hover:scale-105"
                      onError={() => setHeroImageFailed(true)}
                    />
                  ) : (
                    <div className="flex h-[560px] items-center justify-center bg-gradient-to-br from-slate-100 via-amber-50 to-orange-100">
                      <div className="px-8 text-center">
                        <Palette className="mx-auto mb-5 h-20 w-20 text-amber-600/70" />
                        <p className="text-2xl font-semibold text-slate-900">Œuvre mise en avant</p>
                        <p className="mt-3 text-base text-slate-600">
                          Un univers artistique fort, dans une présentation plus premium.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/10 to-transparent" />

                  <div className="absolute left-6 top-6">
                    <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 backdrop-blur-md">
                      Sélection curatoriale
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                      {heroArtwork?.category ?? "Art contemporain"}
                    </p>

                    <h2 className="max-w-md text-3xl font-bold text-white lg:text-4xl">
                      {heroArtwork?.title ?? "Une œuvre pensée pour marquer le regard"}
                    </h2>

                    <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/85">
                      {heroArtwork?.description
                        ? heroArtwork.description
                        : "Une présence visuelle forte, une mise en scène sobre, et davantage d’espace laissé à l’émotion."}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-4 text-white">
                      <span className="rounded-full bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur-sm">
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

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Atmosphère</p>
                    <p className="mt-2 text-lg font-semibold leading-snug text-slate-900">
                      Épurée, premium, centrée sur l’œuvre
                    </p>
                  </div>

                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">Promesse</p>
                    <p className="mt-2 text-lg font-semibold leading-snug text-slate-900">
                      Art authentique et finition haut de gamme
                    </p>
                  </div>

                  <Link
                    href="/gallery"
                    className="col-span-2 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5 transition hover:bg-slate-100 lg:col-span-1"
                  >
                    <p className="text-sm font-medium text-slate-500">Navigation</p>
                    <div className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                      Explorer la galerie
                      <ArrowUpRight className="h-5 w-5 text-amber-600" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Qualité galerie</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Une restitution visuelle pensée pour valoriser les détails, la profondeur et la force
              de l’œuvre.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <Frame className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Prêt à exposer</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Une présentation soignée, conçue pour donner immédiatement une vraie présence à
              l’œuvre dans l’espace.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <Truck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Livraison sécurisée</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Un parcours simple, rassurant, suivi, pensé pour que chaque commande arrive dans de
              bonnes conditions.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Achat en confiance</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Paiements sécurisés, espace vendeur structuré et expérience d’achat conçue pour être
              fluide et crédible.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
              <Star className="h-4 w-4" />
              Qualité & fabrication
            </div>

            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Une qualité premium pensée pour durer et impressionner
            </h2>

            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              La Toile Collective ne doit pas seulement être belle à l’écran. L’expérience doit
              aussi être forte au moment de la réception : finition soignée, présence visuelle,
              rendu élégant, sensation de pièce choisie avec exigence.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-sm">
              {!ambianceImageFailed ? (
                <img
                  src={ambianceImage}
                  alt={secondArtwork?.title || "Ambiance premium"}
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="h-[520px] w-full object-cover transition-transform duration-700 hover:scale-105"
                  onError={() => setAmbianceImageFailed(true)}
                />
              ) : (
                <div className="flex h-[520px] items-center justify-center bg-gradient-to-br from-slate-100 via-white to-amber-50">
                  <div className="px-8 text-center">
                    <Frame className="mx-auto mb-4 h-16 w-16 text-amber-600/70" />
                    <p className="text-2xl font-semibold text-slate-900">Présence premium</p>
                    <p className="mt-2 text-slate-600">
                      Une œuvre pensée comme une pièce forte dans un intérieur.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-semibold text-slate-900">Rendu haut de gamme</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Une image plus profonde, plus propre, plus digne d’un achat émotionnel et
                  décoratif.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-semibold text-slate-900">Finitions soignées</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Chaque détail compte : netteté, présence, équilibre visuel et sensation premium.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-semibold text-slate-900">Impact décoratif</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  L’œuvre n’est pas seulement achetée : elle devient un point focal dans
                  l’intérieur.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-semibold text-slate-900">Expérience rassurante</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Une plateforme plus claire, plus crédible, pensée pour rassurer autant les
                  acheteurs que les artistes.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 sm:col-span-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">
                  Vision
                </p>
                <p className="mt-3 text-base leading-relaxed text-slate-700">
                  Rester sobre, élégant et émotionnel. Ici, on vend moins de technique brute et
                  beaucoup plus de désir, de confiance et de présence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-4xl font-bold">Artistes en vedette</h2>
              <p className="mt-2 max-w-2xl text-slate-600">
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
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {featuredArtists.map((artist) => (
                <Link key={artist.id} href={`/artist/${artist.id}`} className="block">
                  <div className="group h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="relative h-80 overflow-hidden bg-slate-100">
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

                      <div className="absolute bottom-0 left-0 right-0 p-6">
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

                    <div className="p-6">
                      <p className="min-h-[72px] text-slate-600">{artist.bio}</p>

                      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-700">
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

      <section className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-4xl font-bold">Œuvres à découvrir</h2>
              <p className="mt-2 text-slate-600">
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
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.slice(0, 3).map((product) => (
                <Link key={product.id} href={`/product/${product.id}`} className="block">
                  <div className="group h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                    {product.images && product.images.length > 0 ? (
                      <div className="relative h-80 overflow-hidden bg-slate-100">
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
                      <div className="flex h-80 items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                        <span className="text-slate-500">Pas d&apos;image</span>
                      </div>
                    )}

                    <div className="p-6">
                      <h3 className="mb-2 text-2xl font-semibold text-slate-900">{product.title}</h3>
                      <p className="min-h-[52px] text-slate-600">
                        {product.description || "Une œuvre sélectionnée pour sa présence et son caractère."}
                      </p>

                      <div className="mt-5 flex items-center justify-between">
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
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
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

      <section className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 max-w-3xl">
            <h2 className="text-4xl font-bold">Une expérience pensée pour inspirer confiance</h2>
            <p className="mt-3 text-slate-600">
              Tout doit donner envie d’acheter sans bruit inutile : lisibilité, qualité perçue,
              simplicité, émotion et crédibilité.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">1. Choisir une œuvre</h3>
              <p className="mt-3 leading-relaxed text-slate-600">
                Parcourez une galerie conçue pour mettre l’image en valeur et laisser la place au
                coup de cœur.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">2. Commander simplement</h3>
              <p className="mt-3 leading-relaxed text-slate-600">
                Une expérience fluide, claire et rassurante, pensée pour éviter toute friction au
                moment de l’achat.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">3. Recevoir avec plaisir</h3>
              <p className="mt-3 leading-relaxed text-slate-600">
                La commande arrive comme une vraie pièce choisie avec soin, et non comme un simple
                produit impersonnel.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-12 text-center text-4xl font-bold">
            Pourquoi choisir La Toile Collective ?
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
              <Palette className="mb-3 h-8 w-8 text-amber-600" />
              <h3 className="mb-3 text-xl font-semibold">Pour les artistes</h3>
              <p className="text-slate-600">
                Publiez vos œuvres et présentez votre univers sans lourdeur technique.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
              <ShoppingCart className="mb-3 h-8 w-8 text-amber-600" />
              <h3 className="mb-3 text-xl font-semibold">Paiements sécurisés</h3>
              <p className="text-slate-600">
                Commandes fluides, paiements fiables et expérience d’achat pensée pour rassurer
                acheteurs comme artistes.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
              <Users className="mb-3 h-8 w-8 text-amber-600" />
              <h3 className="mb-3 text-xl font-semibold">Communauté</h3>
              <p className="text-slate-600">
                Rassemble artistes, collectionneurs et amateurs autour d&apos;une galerie vivante.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
              <TrendingUp className="mb-3 h-8 w-8 text-amber-600" />
              <h3 className="mb-3 text-xl font-semibold">Croissance</h3>
              <p className="text-slate-600">
                Tableau de bord vendeur, gestion des œuvres et vision claire des revenus potentiels.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-900 via-slate-800 to-amber-700 p-12 text-white shadow-xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-white/75">
                La Toile Collective
              </p>

              <h2 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
                Une galerie pensée pour donner plus de valeur à l’art, plus de confiance à l’achat,
                et plus de stature aux artistes.
              </h2>

              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
                Ici, on cherche moins à faire du bruit qu’à créer une vraie impression : émotion,
                élégance, présence et crédibilité.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/gallery"
                className="rounded-xl bg-white px-6 py-3 text-slate-900 transition hover:bg-slate-100"
              >
                Voir les œuvres
              </Link>

              <Link
                href={isAuthenticated ? "/seller-dashboard" : "/auth"}
                className="rounded-xl border border-white/30 px-6 py-3 text-white transition hover:bg-white/10"
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
              <p className="text-sm text-slate-400">contact@latoilecollective.com</p>
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