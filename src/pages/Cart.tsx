import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Trash2, ShoppingCart } from "lucide-react";
import { supabase } from "../lib/supabase";

type Product = {
  id: number;
  title: string;
  category: string;
  price: number;
  images?: string[] | null;
};

type CartItemRow = {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
};

type CartItemWithProduct = {
  id: number;
  productId: number;
  quantity: number;
  product: Product;
};

export default function Cart() {
  const [, setLocation] = useLocation();

  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
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

    if (appUserError) {
      alert(`Erreur utilisateur: ${appUserError.message}`);
      return null;
    }

    if (!appUser) {
      alert("Profil utilisateur introuvable.");
      return null;
    }

    return Number(appUser.id);
  }

  async function fetchCart() {
    setLoading(true);

    const resolvedUserId = await resolveCurrentUserId();

    if (!resolvedUserId) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    setCurrentUserId(resolvedUserId);

    const { data: cartRows, error: cartError } = await supabase
      .from("cartItems")
      .select("*")
      .eq("userId", resolvedUserId)
      .order("createdAt", { ascending: false });

    if (cartError) {
      console.error("Erreur chargement panier:", cartError);
      alert(`Erreur Supabase: ${cartError.message}`);
      setCartItems([]);
      setLoading(false);
      return;
    }

    const rows = (cartRows || []) as CartItemRow[];

    if (rows.length === 0) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    const productIds = rows.map((row) => row.productId);

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    if (productsError) {
      console.error("Erreur chargement produits du panier:", productsError);
      alert(`Erreur Supabase: ${productsError.message}`);
      setCartItems([]);
      setLoading(false);
      return;
    }

    const productsMap = new Map<number, Product>();

    for (const p of productsData || []) {
      productsMap.set(p.id, {
        id: p.id,
        title: p.title,
        category: p.category ?? "Autre",
        price: Number(p.price ?? 0),
        images: Array.isArray(p.images) ? p.images : [],
      });
    }

    const merged: CartItemWithProduct[] = rows
      .map((row) => {
        const product = productsMap.get(row.productId);
        if (!product) return null;

        return {
          id: row.id,
          productId: row.productId,
          quantity: row.quantity,
          product,
        };
      })
      .filter(Boolean) as CartItemWithProduct[];

    setCartItems(merged);
    setLoading(false);
  }

  useEffect(() => {
    fetchCart();
  }, []);

  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cartItems]);

  const handleRemoveItem = async (cartItemId: number) => {
    const { error } = await supabase.from("cartItems").delete().eq("id", cartItemId);

    if (error) {
      console.error("Erreur suppression article panier:", error);
      alert(`Erreur lors de la suppression: ${error.message}`);
      return;
    }

    fetchCart();
  };

  const handleClearCart = async () => {
    if (!currentUserId) {
      alert("Utilisateur introuvable.");
      return;
    }

    const confirmed = window.confirm("Vider complètement le panier ?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("cartItems")
      .delete()
      .eq("userId", currentUserId);

    if (error) {
      console.error("Erreur vidage panier:", error);
      alert(`Erreur lors du vidage: ${error.message}`);
      return;
    }

    fetchCart();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            href="/gallery"
            className="mb-4 flex items-center gap-2 text-amber-600 hover:text-amber-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Continuer vos achats
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Votre panier</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="py-20 text-center text-slate-600">Chargement du panier...</div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Panier vide</h2>
            <p className="text-slate-600 mb-6">
              Vous n&apos;avez pas encore ajouté d&apos;œuvres à votre panier.
            </p>
            <Link
              href="/gallery"
              className="inline-flex rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
            >
              Découvrir la galerie
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const product = item.product;

                return (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-6">
                    <div className="flex gap-4">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="h-24 w-24 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded bg-slate-200">
                          <span className="text-xs text-slate-500">Pas d&apos;image</span>
                        </div>
                      )}

                      <div className="flex-1">
                        <Link
                          href={`/product/${item.productId}`}
                          className="text-lg font-semibold text-slate-900 hover:text-amber-600"
                        >
                          {product.title}
                        </Link>
                        <p className="text-sm text-slate-600 mb-2">{product.category}</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {product.price.toFixed(2)}€
                        </p>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <div className="rounded bg-slate-100 px-3 py-1 font-semibold">
                          x{item.quantity}
                        </div>
                        <button
                          className="rounded p-2 hover:bg-slate-100"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <div className="sticky top-24 rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-6">
                  <h2 className="text-xl font-semibold text-slate-900">Résumé de la commande</h2>
                </div>

                <div className="space-y-4 p-6">
                  <div className="border-b border-slate-200 pb-4 space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Sous-total</span>
                      <span>{total.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Frais de port</span>
                      <span>Gratuit</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xl font-bold text-slate-900">
                    <span>Total</span>
                    <span className="text-amber-600">{total.toFixed(2)}€</span>
                  </div>

                  <Link
                    href="/checkout"
                    className="block w-full rounded-lg bg-amber-600 px-4 py-3 text-center text-white hover:bg-amber-700"
                  >
                    Procéder au paiement
                  </Link>

                  <button
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
                    onClick={handleClearCart}
                  >
                    Vider le panier
                  </button>

                  <Link
                    href="/gallery"
                    className="block w-full rounded-lg px-4 py-2 text-center text-slate-700 hover:bg-slate-100"
                  >
                    Continuer vos achats
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}