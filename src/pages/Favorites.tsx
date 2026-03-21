import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Heart, ShoppingCart, ArrowLeft } from "lucide-react";
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

type ArtistMap = Record<number, string>;

export default function Favorites() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [artistNames, setArtistNames] = useState<ArtistMap>({});
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  async function resolveCurrentUserId() {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setLocation("/auth");
      return null;
    }

    const authUser = authData.user;

    const { data: appUser, error: appUserError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", authUser.email ?? "")
      .maybeSingle();

    if (appUserError || !appUser) {
      setLocation("/auth");
      return null;
    }

    return Number(appUser.id);
  }

  async function loadFavorites() {
    setLoading(true);

    const userId = await resolveCurrentUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    setCurrentUserId(userId);

    const { data: favoritesData, error: favoritesError } = await supabase
      .from("favorites")
      .select("productId")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (favoritesError) {
      console.error("Erreur chargement favoris:", favoritesError);
      setProducts([]);
      setLoading(false);
      return;
    }

    const productIds = (favoritesData || [])
      .map((item: any) => Number(item.productId))
      .filter((id: number) => !Number.isNaN(id));

    if (productIds.length === 0) {
      setProducts([]);
      setArtistNames({});
      setLoading(false);
      return;
    }

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds)
      .eq("isActive", true);

    if (productsError) {
      console.error("Erreur chargement produits favoris:", productsError);
      setProducts([]);
      setLoading(false);
      return;
    }

    const normalized: Product[] = (productsData || []).map((item: any) => ({
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

    const sortedProducts = productIds
      .map((id) => normalized.find((product) => product.id === id))
      .filter((product): product is Product => Boolean(product));

    setProducts(sortedProducts);

    const artistIds = [
      ...new Set(
        sortedProducts
          .map((product) => product.artistId)
          .filter((id): id is number => typeof id === "number")
      ),
    ];

    if (artistIds.length === 0) {
      setArtistNames({});
      setLoading(false);
      return;
    }

    const { data: artistsData, error: artistsError } = await supabase
      .from("artists")
      .select("id, userId")
      .in("id", artistIds);

    if (artistsError) {
      console.error("Erreur chargement artistes:", artistsError);
      setLoading(false);
      return;
    }

    const userIds = (artistsData || [])
      .map((artist: any) => artist.userId)
      .filter((id: any) => typeof id === "number");

    if (userIds.length === 0) {
      setArtistNames({});
      setLoading(false);
      return;
    }

    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", userIds);

    if (usersError) {
      console.error("Erreur chargement noms artistes:", usersError);
      setLoading(false);
      return;
    }

    const userMap = new Map<number, string>();
    for (const user of usersData || []) {
      userMap.set(user.id, user.name || user.email || "Artiste");
    }

    const namesMap: ArtistMap = {};
    for (const artist of artistsData || []) {
      namesMap[artist.id] = userMap.get(artist.userId) ?? "Artiste";
    }

    setArtistNames(namesMap);
    setLoading(false);
  }

  async function handleRemoveFavorite(productId: number) {
    if (!currentUserId) return;

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("userId", currentUserId)
      .eq("productId", productId);

    if (error) {
      alert(`Erreur favoris: ${error.message}`);
      return;
    }

    setProducts((prev) => prev.filter((product) => product.id !== productId));
  }

  useEffect(() => {
    loadFavorites();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <Link
            href="/gallery"
            className="mb-4 inline-flex items-center gap-2 text-amber-600 hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la galerie
          </Link>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">Mes favoris</h1>

            <Link
              href="/cart"
              className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Panier
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">
        {loading ? (
          <div className="py-20 text-center text-slate-600">
            Chargement des favoris...
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="group h-full overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-lg"
              >
                <Link href={`/product/${product.id}`} className="block">
                  {product.images && product.images.length > 0 ? (
                    <div className="relative h-64 overflow-hidden bg-slate-100">
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute right-3 top-3 rounded-full bg-amber-600 px-3 py-1 text-sm font-semibold text-white">
                        {product.category}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                      <span className="text-slate-500">Pas d&apos;image</span>
                    </div>
                  )}
                </Link>

                <div className="p-6">
                  <Link href={`/product/${product.id}`} className="block">
                    <h2 className="mb-2 text-xl font-semibold text-slate-900">
                      {product.title}
                    </h2>
                  </Link>

                  <p className="mb-2 line-clamp-2 text-slate-600">
                    {product.description || "Pas de description"}
                  </p>

                  {product.artistId ? (
                    <Link
                      href={`/artist/${product.artistId}`}
                      className="mb-4 inline-block text-sm font-medium text-amber-700 hover:text-amber-800 hover:underline"
                    >
                      Par {artistNames[product.artistId] ?? "Artiste"}
                    </Link>
                  ) : (
                    <p className="mb-4 text-sm text-slate-500">Artiste inconnu</p>
                  )}

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-amber-600">
                        {product.price.toFixed(2)}€
                      </p>
                      <p className="text-sm text-slate-500">
                        Stock : {product.stock}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(product.id)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-100"
                    >
                      <span className="inline-flex items-center">
                        <Heart className="mr-2 h-4 w-4 fill-red-500 text-red-500" />
                        Retirer
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Heart className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h2 className="mb-2 text-2xl font-semibold text-slate-900">
              Aucun favori pour le moment
            </h2>
            <p className="mb-6 text-slate-600">
              Enregistrez les œuvres que vous aimez pour les retrouver facilement.
            </p>
            <Link
              href="/gallery"
              className="rounded-lg bg-amber-600 px-5 py-3 text-white hover:bg-amber-700"
            >
              Explorer la galerie
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}