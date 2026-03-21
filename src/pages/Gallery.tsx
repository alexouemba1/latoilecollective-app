import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Search, Filter, Heart, House } from "lucide-react";
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

type ArtistMap = Record<number, string>;

const CATEGORIES = [
  "Peinture",
  "Sculpture",
  "Photographie",
  "Dessin",
  "Céramique",
  "Autre",
];

const PRICE_RANGES = [
  { label: "Tous les prix", min: undefined, max: undefined },
  { label: "0 - 100€", min: 0, max: 100 },
  { label: "100 - 500€", min: 100, max: 500 },
  { label: "500 - 1000€", min: 500, max: 1000 },
  { label: "1000€+", min: 1000, max: undefined },
];

function normalizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const cleaned = value
    .map((keyword) => String(keyword ?? "").trim())
    .filter((keyword) => keyword.length > 0);

  return [...new Set(cleaned)];
}

function getSearchFromUrl(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("search")?.trim() || "";
}

function updateGalleryUrlSearch(searchValue: string) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);

  if (searchValue.trim()) {
    url.searchParams.set("search", searchValue.trim());
  } else {
    url.searchParams.delete("search");
  }

  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

export default function Gallery() {
  const [location, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedPrice, setSelectedPrice] = useState<{ min?: number; max?: number }>({});
  const [showFilters, setShowFilters] = useState(false);

  const [productsFromDb, setProductsFromDb] = useState<Product[]>([]);
  const [artistNames, setArtistNames] = useState<ArtistMap>({});
  const [favoriteProductIds, setFavoriteProductIds] = useState<number[]>([]);
  const [favoriteLoadingIds, setFavoriteLoadingIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  async function resolveCurrentUserId() {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return null;
    }

    const authUser = authData.user;

    const { data: appUser, error: appUserError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", authUser.email ?? "")
      .maybeSingle();

    if (appUserError || !appUser) {
      return null;
    }

    return Number(appUser.id);
  }

  async function loadFavorites(userId: number) {
    const { data, error } = await supabase
      .from("favorites")
      .select("productId")
      .eq("userId", userId);

    if (error) {
      console.error("Erreur chargement favoris galerie:", error);
      setFavoriteProductIds([]);
      return;
    }

    const ids = (data || [])
      .map((item: any) => Number(item.productId))
      .filter((id: number) => !Number.isNaN(id));

    setFavoriteProductIds(ids);
  }

  async function handleToggleFavorite(productId: number) {
    const userId = currentUserId ?? (await resolveCurrentUserId());

    if (!userId) {
      setLocation("/auth");
      return;
    }

    if (!currentUserId) {
      setCurrentUserId(userId);
    }

    setFavoriteLoadingIds((prev) => [...prev, productId]);

    const isFavorite = favoriteProductIds.includes(productId);

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("userId", userId)
        .eq("productId", productId);

      if (error) {
        alert(`Erreur favoris: ${error.message}`);
        setFavoriteLoadingIds((prev) => prev.filter((id) => id !== productId));
        return;
      }

      setFavoriteProductIds((prev) => prev.filter((id) => id !== productId));
      setFavoriteLoadingIds((prev) => prev.filter((id) => id !== productId));
      return;
    }

    const { error } = await supabase.from("favorites").insert([
      {
        userId,
        productId,
      },
    ]);

    if (error) {
      alert(`Erreur favoris: ${error.message}`);
      setFavoriteLoadingIds((prev) => prev.filter((id) => id !== productId));
      return;
    }

    setFavoriteProductIds((prev) => [...prev, productId]);
    setFavoriteLoadingIds((prev) => prev.filter((id) => id !== productId));
  }

  function applyKeywordSearch(keyword: string) {
    const cleanKeyword = keyword.trim();
    setSearch(cleanKeyword);
    updateGalleryUrlSearch(cleanKeyword);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const urlSearch = getSearchFromUrl();
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [location]);

  useEffect(() => {
    async function initializePage() {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const authenticated = !!sessionData.session;
      setIsAuthenticated(authenticated);

      const resolvedUserId = authenticated ? await resolveCurrentUserId() : null;
      setCurrentUserId(resolvedUserId);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("isActive", true)
        .order("createdAt", { ascending: false });

      if (error) {
        setError(error.message);
        setProductsFromDb([]);
        setLoading(false);
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
        keywords: normalizeKeywords(item.keywords),
        stock: Number(item.stock ?? 0),
        isActive: Boolean(item.isActive),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      const artistIds = [
        ...new Set(
          normalized
            .map((product) => product.artistId)
            .filter((id): id is number => typeof id === "number")
        ),
      ];

      if (artistIds.length > 0) {
        const { data: artistsData, error: artistsError } = await supabase
          .from("artists")
          .select("id, bio, userId, isActive")
          .in("id", artistIds)
          .eq("isActive", true);

        if (artistsError) {
          setError(artistsError.message);
          setLoading(false);
          return;
        }

        const activeArtists = artistsData || [];
        const activeArtistIds = new Set(activeArtists.map((artist: any) => Number(artist.id)));

        const filteredProducts = normalized.filter(
          (product) =>
            typeof product.artistId === "number" && activeArtistIds.has(Number(product.artistId))
        );

        setProductsFromDb(filteredProducts);

        const userIds = activeArtists
          .map((artist: any) => artist.userId)
          .filter((id: any) => typeof id === "number");

        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, name, email")
            .in("id", userIds);

          if (usersError) {
            setError(usersError.message);
            setLoading(false);
            return;
          }

          const userMap = new Map<number, string>();
          for (const user of usersData || []) {
            userMap.set(Number(user.id), user.name || user.email || "Artiste");
          }

          const namesMap: ArtistMap = {};
          for (const artist of activeArtists) {
            namesMap[Number(artist.id)] = userMap.get(Number(artist.userId)) ?? "Artiste";
          }

          setArtistNames(namesMap);
        } else {
          setArtistNames({});
        }
      } else {
        setProductsFromDb([]);
        setArtistNames({});
      }

      if (resolvedUserId) {
        await loadFavorites(resolvedUserId);
      } else {
        setFavoriteProductIds([]);
      }

      setLoading(false);
    }

    void initializePage();
  }, []);

  const products = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return productsFromDb.filter((product) => {
      const title = product.title.toLowerCase();
      const description = (product.description || "").toLowerCase();
      const category = (product.category || "").toLowerCase();
      const keywords = Array.isArray(product.keywords)
        ? product.keywords.map((keyword) => String(keyword).toLowerCase())
        : [];

      const matchesSearch =
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        category.includes(normalizedSearch) ||
        keywords.some((keyword) => keyword.includes(normalizedSearch));

      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesMin = selectedPrice.min === undefined || product.price >= selectedPrice.min;
      const matchesMax = selectedPrice.max === undefined || product.price <= selectedPrice.max;

      return matchesSearch && matchesCategory && matchesMin && matchesMax;
    });
  }, [productsFromDb, search, selectedCategory, selectedPrice]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-2xl font-bold tracking-tight text-slate-900 transition hover:text-amber-600"
              >
                La Toile Collective
              </Link>

              <Link
                href="/"
                className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-100"
              >
                <House className="mr-2 h-4 w-4" />
                Accueil
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isAuthenticated && (
                <Link
                  href="/favorites"
                  className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-100"
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Favoris
                </Link>
              )}

              <Link
                href="/cart"
                className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-100"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Panier
              </Link>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              placeholder="Rechercher une œuvre, une description ou un mot-clé..."
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                updateGalleryUrlSearch(value);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 outline-none transition focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className={`lg:block ${showFilters ? "block" : "hidden"}`}>
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-slate-900">
                <Filter className="h-5 w-5" />
                Filtres
              </h2>

              <div className="mb-6">
                <h3 className="mb-3 font-semibold text-slate-900">Catégorie</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory(undefined)}
                    className={`block w-full rounded-xl px-3 py-2 text-left transition ${
                      selectedCategory === undefined
                        ? "bg-amber-100 text-amber-900"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Toutes
                  </button>

                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`block w-full rounded-xl px-3 py-2 text-left transition ${
                        selectedCategory === cat
                          ? "bg-amber-100 text-amber-900"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 font-semibold text-slate-900">Prix</h3>
                <div className="space-y-2">
                  {PRICE_RANGES.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => setSelectedPrice({ min: range.min, max: range.max })}
                      className={`block w-full rounded-xl px-3 py-2 text-left transition ${
                        selectedPrice.min === range.min && selectedPrice.max === range.max
                          ? "bg-amber-100 text-amber-900"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-100"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory(undefined);
                  setSelectedPrice({});
                  updateGalleryUrlSearch("");
                }}
              >
                Réinitialiser
              </button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <h2 className="text-xl font-bold text-slate-900">
                {products.length} œuvre{products.length !== 1 ? "s" : ""}
              </h2>

              <button
                className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtres
              </button>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-600">Chargement des œuvres...</div>
            ) : error ? (
              <div className="py-20 text-center text-red-600">Erreur Supabase : {error}</div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product, index) => {
                  const isFavorite = favoriteProductIds.includes(product.id);
                  const isFavoriteLoading = favoriteLoadingIds.includes(product.id);
                  const isOutOfStock = product.stock <= 0;
                  const isNew = index < 3;

                  return (
                    <div
                      key={product.id}
                      className="group h-full overflow-hidden rounded-3xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    >
                      <div className="relative">
                        <Link href={`/product/${product.id}`} className="block">
                          {product.images && product.images.length > 0 ? (
                            <div className="relative h-64 overflow-hidden bg-slate-100">
                              <img
                                src={product.images[0]}
                                alt={product.title}
                                loading="lazy"
                                decoding="async"
                               className={`h-full w-full object-cover object-top transition duration-700 ease-out group-hover:scale-105 ${
  isOutOfStock ? "opacity-75" : ""
}`}
                              />

                              <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow backdrop-blur">
                                {product.category}
                              </div>

                              {isNew && (
                                <div className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                                  Nouveau
                                </div>
                              )}

                              {isOutOfStock && (
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
                                  Vendu
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="relative flex h-64 items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                              <span className="text-slate-500">Pas d&apos;image</span>

                              {isNew && (
                                <div className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                                  Nouveau
                                </div>
                              )}

                              {isOutOfStock && (
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
                                  Vendu
                                </div>
                              )}
                            </div>
                          )}
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(product.id)}
                          disabled={isFavoriteLoading}
                          className="absolute left-3 top-3 rounded-full bg-white/80 p-2 text-slate-700 shadow transition hover:scale-110 hover:bg-white disabled:opacity-60"
                          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                        >
                          <Heart
                            className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
                          />
                        </button>
                      </div>

                      <div className="p-6">
                        <Link href={`/product/${product.id}`} className="block">
                          <h3 className="mb-2 line-clamp-2 text-xl font-semibold text-slate-900">
                            {product.title}
                          </h3>
                        </Link>

                        <p className="mb-2 line-clamp-2 text-slate-600">
                          {product.description || "Pas de description"}
                        </p>

                        {Array.isArray(product.keywords) && product.keywords.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {product.keywords.map((keyword) => (
                              <button
                                key={`${product.id}-${keyword}`}
                                type="button"
                                onClick={() => applyKeywordSearch(keyword)}
                                className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 transition hover:bg-amber-100 hover:text-amber-900"
                                title={`Rechercher : ${keyword}`}
                              >
                                #{keyword}
                              </button>
                            ))}
                          </div>
                        )}

                        {product.artistId ? (
                          <Link
                            href={`/artist/${product.artistId}`}
                            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-600 transition hover:text-amber-700 hover:underline"
                          >
                            <span aria-hidden="true">👤</span>
                            <span>{artistNames[product.artistId] ?? "Artiste"}</span>
                          </Link>
                        ) : (
                          <p className="mb-4 text-sm text-slate-500">Artiste inconnu</p>
                        )}

                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-2xl font-bold text-amber-600">
                              {product.price.toFixed(2)}€
                            </p>
                            <p
                              className={`text-sm ${
                                isOutOfStock ? "font-semibold text-red-600" : "text-slate-500"
                              }`}
                            >
                              {isOutOfStock ? "Rupture de stock" : `Stock : ${product.stock}`}
                            </p>
                          </div>

                          {isOutOfStock ? (
                            <div className="cursor-not-allowed rounded-xl bg-slate-300 p-2 text-white">
                              <ShoppingCart className="h-4 w-4" />
                            </div>
                          ) : (
                            <Link
                              href={`/product/${product.id}`}
                              className="rounded-xl bg-amber-600 p-2 text-white shadow transition hover:scale-105 hover:bg-amber-700"
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <House className="h-7 w-7" />
                </div>

                <h3 className="mb-3 text-2xl font-semibold text-slate-900">
                  Aucune œuvre active pour le moment
                </h3>

                <p className="mx-auto mb-6 max-w-2xl text-slate-600">
                  La galerie publique est encore vide. Vous pouvez revenir à l&apos;accueil ou
                  patienter jusqu&apos;à la publication des prochaines œuvres.
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/"
                    className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-800"
                  >
                    <House className="mr-2 h-4 w-4" />
                    Retour à l’accueil
                  </Link>

                  {isAuthenticated && (
                    <Link
                      href="/seller-dashboard"
                      className="inline-flex items-center rounded-xl border border-slate-300 px-5 py-3 text-slate-700 hover:bg-slate-100"
                    >
                      Aller à mon espace vendeur
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}