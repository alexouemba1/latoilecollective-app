import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  ShoppingCart,
  BadgeCheck,
  Palette,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Artist = {
  id: number;
  userId: number;
  bio: string | null;
  profileImage: string | null;
  commissionRate?: number | null;
  isVerified?: boolean | null;
  profileImagePositionX?: number | null;
  profileImagePositionY?: number | null;
};

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
};

export default function ArtistPage() {
  const params = useParams();
  const artistId = Number(params.id);

  const [artist, setArtist] = useState<Artist | null>(null);
  const [artistName, setArtistName] = useState("Artiste");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArtistPage() {
      if (!artistId || Number.isNaN(artistId)) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: artistData, error: artistError } = await supabase
        .from("artists")
        .select("id, userId, bio, profileImage, commissionRate, isVerified, profileImagePositionX, profileImagePositionY")
        .eq("id", artistId)
        .maybeSingle();

      if (artistError || !artistData) {
        setArtist(null);
        setProducts([]);
        setLoading(false);
        return;
      }

      setArtist({
        id: Number(artistData.id),
        userId: Number(artistData.userId),
        bio: artistData.bio ?? "",
        profileImage: artistData.profileImage ?? "",
        commissionRate: artistData.commissionRate ?? null,
        isVerified: artistData.isVerified ?? false,
        profileImagePositionX: Number(artistData.profileImagePositionX ?? 50),
        profileImagePositionY: Number(artistData.profileImagePositionY ?? 50),
      });

      const { data: userData } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", artistData.userId)
        .maybeSingle();

      setArtistName(userData?.name || userData?.email || "Artiste");

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("artistId", artistId)
        .eq("isActive", true)
        .order("createdAt", { ascending: false });

      if (productsError) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const normalizedProducts: Product[] = (productsData || []).map((item: any) => ({
        id: item.id,
        artistId: item.artistId ?? null,
        title: item.title,
        description: item.description ?? "",
        price: Number(item.price ?? 0),
        category: item.category ?? "Autre",
        images: Array.isArray(item.images) ? item.images : [],
        stock: Number(item.stock ?? 0),
        isActive: Boolean(item.isActive),
      }));

      setProducts(normalizedProducts);
      setLoading(false);
    }

    fetchArtistPage();
  }, [artistId]);

  const totalWorks = products.length;

  const categoriesCount = useMemo(() => {
    return new Set(products.map((product) => product.category)).size;
  }, [products]);

  const availableWorks = useMemo(() => {
    return products.filter((product) => product.stock > 0).length;
  }, [products]);

  const heroImage = useMemo(() => {
    if (artist?.profileImage) {
      return artist.profileImage;
    }

    const withImage = products.find(
      (product) => Array.isArray(product.images) && product.images.length > 0
    );

    return withImage?.images?.[0] || "";
  }, [artist?.profileImage, products]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Chargement de l’artiste...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <p className="mb-4 text-lg text-slate-600">Artiste introuvable</p>
        <Link
          href="/gallery"
          className="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
        >
          Retour à la galerie
        </Link>
      </div>
    );
  }

  const imagePositionStyle = {
    objectPosition: `${Number(artist.profileImagePositionX ?? 50)}% ${Number(
      artist.profileImagePositionY ?? 50
    )}%`,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Link
            href="/gallery"
            className="mb-6 inline-flex items-center gap-2 text-amber-600 hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la galerie
          </Link>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-amber-50 p-8 shadow-sm">
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                  {artist.profileImage ? (
                    <img
                      src={artist.profileImage}
                      alt={artistName}
                      className="h-full w-full object-cover"
                      style={imagePositionStyle}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-amber-100 text-amber-700">
                      <Palette className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-4xl font-bold text-slate-900">{artistName}</h1>

                    {artist.isVerified ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-900">
                        <BadgeCheck className="h-4 w-4" />
                        Artiste vérifié
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm text-slate-500">Profil artiste</p>
                </div>
              </div>

              <p className="max-w-3xl text-base leading-7 text-slate-600">
                {artist.bio && artist.bio !== "EMPTY"
                  ? artist.bio
                  : "Cet artiste n’a pas encore ajouté de biographie."}
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">Œuvres en ligne</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{totalWorks}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">Catégories</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{categoriesCount}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">Disponibles</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{availableWorks}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {heroImage ? (
                <div className="relative h-full min-h-[320px] bg-slate-100">
                  <img
                    src={heroImage}
                    alt={artistName}
                    className="h-full w-full object-cover"
                    style={artist.profileImage ? imagePositionStyle : undefined}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-slate-900/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-sm font-medium text-white/80">
                      {artist.profileImage ? "Portrait de l’artiste" : "Univers de l’artiste"}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-white">{artistName}</p>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[320px] items-center justify-center bg-gradient-to-br from-slate-100 to-amber-50">
                  <div className="text-center">
                    <ImageIcon className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                    <p className="text-slate-500">Aucune image mise en avant</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Œuvres de {artistName}</h2>
            <p className="mt-2 text-slate-600">
              Découvrez les créations actuellement disponibles dans cette galerie.
            </p>
          </div>

          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
            {products.length} œuvre{products.length !== 1 ? "s" : ""}
          </div>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`} className="block">
                <div className="group h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                  {product.images && product.images.length > 0 ? (
                    <div className="relative h-72 overflow-hidden bg-slate-100">
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute right-4 top-4 rounded-full bg-amber-600 px-3 py-1 text-sm font-semibold text-white shadow-sm">
                        {product.category}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-72 items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                      <span className="text-slate-500">Pas d&apos;image</span>
                    </div>
                  )}

                  <div className="p-6">
                    <h3 className="mb-2 line-clamp-2 text-xl font-semibold text-slate-900">
                      {product.title}
                    </h3>

                    <p className="mb-5 line-clamp-2 text-slate-600">
                      {product.description || "Pas de description"}
                    </p>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-amber-600">
                          {product.price.toFixed(2)}€
                        </p>
                        <p className="text-sm text-slate-500">Stock : {product.stock}</p>
                      </div>

                      <div className="rounded-xl bg-amber-600 p-2.5 text-white shadow-sm transition group-hover:bg-amber-700">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Palette className="h-7 w-7" />
            </div>
            <h3 className="mb-2 text-2xl font-semibold text-slate-900">
              Aucune œuvre active pour le moment
            </h3>
            <p className="text-slate-600">
              Cet artiste n’a pas encore d’œuvre active en ligne.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}