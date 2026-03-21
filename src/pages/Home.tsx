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
        .limit(3);

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
        .select("id, userId, bio, profileImage, isVerified, isActive, profileImagePositionX, profileImagePositionY")
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Palette className="h-8 w-8 text-amber-600" />
            <span className="text-2xl font-bold">La Toile Collective</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/gallery"
              className="rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100"
            >
              Galerie
            </Link>

            {isAuthenticated && (
              <Link
                href="/favorites"
                className="inline-flex items-center rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100"
              >
                <Heart className="mr-2 h-4 w-4" />
                Favoris
              </Link>
            )}

            <Link
              href={isAuthenticated ? "/seller-dashboard" : "/auth"}
              className="rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100"
            >
              Espace vendeur
            </Link>

            <Link
              href="/cart"
              className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
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
                className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
              >
                Se déconnecter
              </button>
            ) : (
              <Link
                href="/auth"
                className="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 py-20 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
            <Sparkles className="h-4 w-4" />
            Marketplace d’art pour artistes contemporains
          </div>

          <h1 className="mb-6 max-w-xl text-5xl font-bold leading-[1.05] tracking-tight lg:text-7xl">
            Découvrez l&apos;art authentique
          </h1>

          <p className="mb-8 max-w-xl text-xl leading-relaxed text-slate-600">
            Une vitrine sobre et élégante pour exposer, vendre et faire rayonner les univers
            artistiques avec une expérience fluide.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/gallery"
              className="rounded-lg bg-slate-900 px-6 py-3 text-white hover:bg-slate-800"
            >
              Explorer la galerie
            </Link>

            <Link
              href={isAuthenticated ? "/seller-dashboard" : "/auth"}
              className="rounded-lg border border-slate-300 px-6 py-3 text-slate-800 hover:bg-slate-100"
            >
              {isAuthenticated ? "Accéder à mon espace vendeur" : "Devenir artiste"}
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-8 top-12 h-36 w-36 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="absolute -right-6 bottom-14 h-40 w-40 rounded-full bg-orange-200/25 blur-3xl" />

          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-4 shadow-[0_35px_90px_rgba(15,23,42,0.10)]">
            <div className="relative overflow-hidden rounded-[1.6rem] bg-slate-100">
              {!heroImageFailed ? (
                <img
                  src={heroImage}
                  alt={heroArtwork?.title || "Œuvre mise en avant"}
                  loading="eager"
                  decoding="async"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="h-[520px] w-full object-cover object-[center_20%] transition-transform duration-700 hover:scale-105"
                  onError={() => setHeroImageFailed(true)}
                />
              ) : (
                <div className="flex h-[520px] items-center justify-center bg-gradient-to-br from-slate-100 via-amber-50 to-orange-100">
                  <div className="px-8 text-center">
                    <Palette className="mx-auto mb-5 h-20 w-20 text-amber-600/70" />
                    <p className="text-2xl font-semibold text-slate-900">Galerie d&apos;art élégante</p>
                    <p className="mt-3 text-base text-slate-600">
                      Une expérience plus luxe, plus calme, et bien moins bavarde.
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent" />

              <div className="absolute left-6 top-6">
                <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 backdrop-blur-md">
                  En vedette
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="max-w-md">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                    {heroArtwork?.category ?? "Sélection curatoriale"}
                  </p>

                  <h2 className="text-3xl font-bold text-white lg:text-4xl">
                    {heroArtwork?.title ?? "Œuvres uniques, artistes singuliers"}
                  </h2>

                  <p className="mt-3 text-sm leading-relaxed text-white/85">
                    {heroArtwork?.description
                      ? heroArtwork.description
                      : "Une mise en scène plus minimaliste pour donner davantage d’espace au regard et à l’œuvre."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-500">Atmosphère</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  Épurée, premium, centrée sur l’image
                </p>
              </div>

              <Link
                href="/gallery"
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:bg-slate-100"
              >
                <p className="text-sm font-medium text-slate-500">Navigation</p>
                <div className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                  Voir la galerie
                  <ArrowUpRight className="h-5 w-5 text-amber-600" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm">
            <div className="grid grid-cols-1 gap-10 p-8 md:p-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                  <BadgeCheck className="h-4 w-4" />
                  Impression haut de gamme
                </div>

                <h2 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  Des œuvres qui prennent vie avec une qualité d’impression premium
                </h2>

                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                  Chaque création présentée sur La Toile Collective est produite à la demande avec
                  des standards professionnels, afin d’offrir une restitution fidèle, élégante et
                  durable. Couleurs profondes, détails précis, finitions soignées : tout est pensé
                  pour sublimer l’œuvre originale et lui donner une présence remarquable.
                </p>

                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                  De la commande jusqu’à la livraison, l’expérience reste entièrement automatisée,
                  simple, fluide et qualitative, pour que collectionneurs et amateurs d’art
                  reçoivent une œuvre prête à habiter leur intérieur avec caractère.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Qualité fine art</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Une impression professionnelle pensée pour respecter la richesse visuelle de
                    chaque création.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Production à la demande</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Chaque œuvre est produite au bon moment, avec une approche plus responsable et
                    sans surstock inutile.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Finitions premium</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Des matériaux soigneusement sélectionnés pour renforcer l’élégance, la tenue et
                    la présence de l’œuvre.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Livraison sécurisée</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Une préparation rigoureuse et un acheminement pensé pour protéger chaque pièce
                    jusqu’à sa destination.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-amber-100 bg-white/70 px-8 py-5 text-center md:px-12">
              <p className="text-sm font-medium text-slate-500">
                Production assurée par un laboratoire d’impression spécialisé, pour un résultat à la
                hauteur de l’artiste et de l’œuvre.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-4xl font-bold">Artistes en vedette</h2>
              <p className="mt-2 max-w-2xl text-slate-600">
                Découvrez des profils singuliers, des univers affirmés et des pages artistes
                pensées comme de véritables vitrines.
              </p>
            </div>

            <Link
              href="/gallery"
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
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

                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

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

                        <p className="text-sm text-white/80">Artiste</p>
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="line-clamp-3 text-slate-600">{artist.bio}</p>

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

      <section className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold">Œuvres à découvrir</h2>
              <p className="mt-2 text-slate-600">
                Un aperçu des dernières créations publiées sur la plateforme.
              </p>
            </div>

            <Link
              href="/gallery"
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
            >
              Voir toute la galerie
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="py-12 text-center text-slate-600">Chargement des œuvres...</div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`} className="block">
                  <div className="group h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg">
                    {product.images && product.images.length > 0 ? (
                      <div className="relative h-72 overflow-hidden bg-slate-100">
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          loading="lazy"
                          decoding="async"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
                        />
                        <div className="absolute right-3 top-3 rounded-full bg-amber-600 px-3 py-1 text-sm font-semibold text-white">
                          {product.category}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-72 items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                        <span className="text-slate-500">Pas d&apos;image</span>
                      </div>
                    )}

                    <div className="p-6">
                      <h3 className="mb-2 text-2xl font-semibold text-slate-900">{product.title}</h3>
                      <p className="mb-4 line-clamp-2 text-slate-600">
                        {product.description || "Pas de description"}
                      </p>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-amber-600">
                            {product.price.toFixed(2)}€
                          </p>
                          <p className="text-sm text-slate-500">Stock : {product.stock}</p>
                        </div>

                        <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 group-hover:bg-amber-50 group-hover:text-amber-700">
                          Voir l’œuvre
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Palette className="h-7 w-7" />
              </div>

              <h3 className="mb-3 text-2xl font-semibold text-slate-900">
                Exposez votre première œuvre
              </h3>

              <p className="mx-auto mb-6 max-w-2xl text-slate-600">
                La galerie publique est encore vide. Ajoutez une œuvre depuis votre espace vendeur
                pour commencer à construire une vitrine élégante.
              </p>

              <Link
                href={isAuthenticated ? "/seller-dashboard" : "/auth"}
                className="inline-flex rounded-lg bg-slate-900 px-5 py-3 text-white hover:bg-slate-800"
              >
                {isAuthenticated ? "Ajouter une œuvre" : "Créer mon espace artiste"}
              </Link>
            </div>
          )}
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
        <div className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 p-12 text-center text-white">
          <h2 className="mb-4 text-4xl font-bold">Prêt à commencer ?</h2>
          <p className="mb-8 text-lg opacity-90">
            Rejoignez les artistes qui exposent leurs créations sur La Toile Collective.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/gallery"
              className="rounded-lg bg-white px-6 py-3 text-amber-700 hover:bg-slate-100"
            >
              Voir les œuvres
            </Link>

            <Link
              href={isAuthenticated ? "/seller-dashboard" : "/auth"}
              className="rounded-lg border border-white/40 px-6 py-3 text-white hover:bg-white/10"
            >
              {isAuthenticated ? "Accéder à mon espace vendeur" : "S&apos;inscrire gratuitement"}
            </Link>
          </div>
        </div>
      </section>

      <footer className="mt-20 border-t border-slate-200 bg-slate-900 py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4 font-bold">La Toile Collective</h3>
              <p className="text-sm text-slate-400">
                La plateforme de vente d&apos;art pour les artistes créatifs.
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