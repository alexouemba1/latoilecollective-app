import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  PackageCheck,
  Truck,
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Product = {
  id: number;
  title: string;
  price: number;
  images?: string[] | null;
  artistId?: number | null;
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

type ShippingMethod = "standard" | "express" | "pickup";

type ShippingForm = {
  shippingName: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingPostalCode: string;
  shippingCity: string;
  shippingCountry: string;
  shippingEmail: string;
  shippingPhone: string;
};

type ArtistShippingSettings = {
  shippingStandardEnabled: boolean;
  shippingExpressEnabled: boolean;
  shippingPickupEnabled: boolean;
  shippingStandardPrice: number;
  shippingExpressPrice: number;
  freeShippingThreshold: number;
  shippingCountries: string;
  shippingProcessingDays: number;
  pickupInstructions: string;
};

const initialShippingForm: ShippingForm = {
  shippingName: "",
  shippingAddressLine1: "",
  shippingAddressLine2: "",
  shippingPostalCode: "",
  shippingCity: "",
  shippingCountry: "France",
  shippingEmail: "",
  shippingPhone: "",
};

const defaultArtistShippingSettings: ArtistShippingSettings = {
  shippingStandardEnabled: true,
  shippingExpressEnabled: true,
  shippingPickupEnabled: false,
  shippingStandardPrice: 7.9,
  shippingExpressPrice: 14.9,
  freeShippingThreshold: 200,
  shippingCountries: "France",
  shippingProcessingDays: 3,
  pickupInstructions: "",
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [cartItemsWithProducts, setCartItemsWithProducts] = useState<CartItemWithProduct[]>([]);
  const [shippingForm, setShippingForm] = useState<ShippingForm>(initialShippingForm);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("standard");
  const [artistShippingSettings, setArtistShippingSettings] = useState<ArtistShippingSettings>(
    defaultArtistShippingSettings
  );

  async function resolveCurrentUserId() {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setLocation("/auth");
      return null;
    }

    const authUser = authData.user;

    if (authUser.email) {
      setShippingForm((prev) => ({
        ...prev,
        shippingEmail: prev.shippingEmail || authUser.email || "",
      }));
    }

    const { data: appUser, error: appUserError } = await supabase
      .from("users")
      .select("id, email, name")
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

    setShippingForm((prev) => ({
      ...prev,
      shippingName: prev.shippingName || appUser.name || "",
      shippingEmail: prev.shippingEmail || appUser.email || authUser.email || "",
    }));

    return Number(appUser.id);
  }

  async function fetchCheckoutItems() {
    setLoading(true);

    const resolvedUserId = await resolveCurrentUserId();

    if (!resolvedUserId) {
      setCartItemsWithProducts([]);
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
      console.error("Erreur chargement checkout:", cartError);
      alert(`Erreur Supabase: ${cartError.message}`);
      setCartItemsWithProducts([]);
      setLoading(false);
      return;
    }

    const rows = (cartRows || []) as CartItemRow[];

    if (rows.length === 0) {
      setCartItemsWithProducts([]);
      setLoading(false);
      return;
    }

    const productIds = rows.map((row) => row.productId);

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    if (productsError) {
      console.error("Erreur chargement produits checkout:", productsError);
      alert(`Erreur Supabase: ${productsError.message}`);
      setCartItemsWithProducts([]);
      setLoading(false);
      return;
    }

    const productsMap = new Map<number, Product>();

    for (const p of productsData || []) {
      productsMap.set(p.id, {
        id: p.id,
        title: p.title,
        price: Number(p.price ?? 0),
        images: Array.isArray(p.images) ? p.images : [],
        artistId: p.artistId ?? null,
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

    setCartItemsWithProducts(merged);

    const artistIds = [
      ...new Set(
        merged
          .map((item) => Number(item.product.artistId ?? 0))
          .filter((artistId) => artistId > 0)
      ),
    ];

    if (artistIds.length !== 1) {
      alert(
        "Le checkout n'accepte pour l'instant que des œuvres d'un seul artiste par commande."
      );
      setCartItemsWithProducts([]);
      setLoading(false);
      return;
    }

    const artistId = artistIds[0];

    const { data: artistData, error: artistError } = await supabase
      .from("artists")
      .select(`
        shippingStandardEnabled:shippingstandardenabled,
        shippingExpressEnabled:shippingexpressenabled,
        shippingPickupEnabled:shippingpickupenabled,
        shippingStandardPrice:shippingstandardprice,
        shippingExpressPrice:shippingexpressprice,
        freeShippingThreshold:freeshippingthreshold,
        shippingCountries:shippingcountries,
        shippingProcessingDays:shippingprocessingdays,
        pickupInstructions:pickupinstructions
      `)
      .eq("id", artistId)
      .maybeSingle();

    if (artistError) {
      console.error("Erreur chargement livraison artiste:", artistError);
      alert(`Erreur Supabase: ${artistError.message}`);
      setLoading(false);
      return;
    }

    if (artistData) {
      const normalizedSettings: ArtistShippingSettings = {
        shippingStandardEnabled: Boolean(artistData.shippingStandardEnabled ?? true),
        shippingExpressEnabled: Boolean(artistData.shippingExpressEnabled ?? true),
        shippingPickupEnabled: Boolean(artistData.shippingPickupEnabled ?? false),
        shippingStandardPrice: Number(artistData.shippingStandardPrice ?? 7.9),
        shippingExpressPrice: Number(artistData.shippingExpressPrice ?? 14.9),
        freeShippingThreshold: Number(artistData.freeShippingThreshold ?? 200),
        shippingCountries: String(artistData.shippingCountries ?? "France"),
        shippingProcessingDays: Number(artistData.shippingProcessingDays ?? 3),
        pickupInstructions: String(artistData.pickupInstructions ?? ""),
      };

      setArtistShippingSettings(normalizedSettings);

      if (normalizedSettings.shippingStandardEnabled) {
        setShippingMethod("standard");
      } else if (normalizedSettings.shippingExpressEnabled) {
        setShippingMethod("express");
      } else if (normalizedSettings.shippingPickupEnabled) {
        setShippingMethod("pickup");
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    void fetchCheckoutItems();
  }, []);

  const subtotal = useMemo(() => {
    return cartItemsWithProducts.reduce((sum, item) => {
      return sum + item.product.price * item.quantity;
    }, 0);
  }, [cartItemsWithProducts]);

  const shippingCost = useMemo(() => {
    if (shippingMethod === "pickup") {
      return 0;
    }

    if (shippingMethod === "express") {
      return artistShippingSettings.shippingExpressPrice;
    }

    if (
      artistShippingSettings.freeShippingThreshold > 0 &&
      subtotal >= artistShippingSettings.freeShippingThreshold
    ) {
      return 0;
    }

    return artistShippingSettings.shippingStandardPrice;
  }, [shippingMethod, subtotal, artistShippingSettings]);

  const isFreeShipping =
    shippingMethod === "standard" &&
    artistShippingSettings.freeShippingThreshold > 0 &&
    subtotal >= artistShippingSettings.freeShippingThreshold;

  const commission = (subtotal * 10) / 100;
  const total = subtotal + shippingCost;

  const availableShippingMethods = useMemo(() => {
    const methods: ShippingMethod[] = [];

    if (artistShippingSettings.shippingStandardEnabled) {
      methods.push("standard");
    }

    if (artistShippingSettings.shippingExpressEnabled) {
      methods.push("express");
    }

    if (artistShippingSettings.shippingPickupEnabled) {
      methods.push("pickup");
    }

    return methods;
  }, [artistShippingSettings]);

  function updateShippingField<K extends keyof ShippingForm>(field: K, value: ShippingForm[K]) {
    setShippingForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function getShippingFormValues(): ShippingForm {
    const formElement = formRef.current;

    if (!formElement) {
      return {
        shippingName: shippingForm.shippingName.trim(),
        shippingAddressLine1: shippingForm.shippingAddressLine1.trim(),
        shippingAddressLine2: shippingForm.shippingAddressLine2.trim(),
        shippingPostalCode: shippingForm.shippingPostalCode.trim(),
        shippingCity: shippingForm.shippingCity.trim(),
        shippingCountry: shippingForm.shippingCountry.trim(),
        shippingEmail: shippingForm.shippingEmail.trim(),
        shippingPhone: shippingForm.shippingPhone.trim(),
      };
    }

    const formData = new FormData(formElement);

    return {
      shippingName: String(formData.get("shippingName") ?? "").trim(),
      shippingAddressLine1: String(formData.get("shippingAddressLine1") ?? "").trim(),
      shippingAddressLine2: String(formData.get("shippingAddressLine2") ?? "").trim(),
      shippingPostalCode: String(formData.get("shippingPostalCode") ?? "").trim(),
      shippingCity: String(formData.get("shippingCity") ?? "").trim(),
      shippingCountry: String(formData.get("shippingCountry") ?? "").trim(),
      shippingEmail: String(formData.get("shippingEmail") ?? "").trim(),
      shippingPhone: String(formData.get("shippingPhone") ?? "").trim(),
    };
  }

  function validateShippingForm(values: ShippingForm) {
    if (!values.shippingName) {
      throw new Error("Veuillez renseigner le nom complet.");
    }

    if (shippingMethod !== "pickup" && !values.shippingAddressLine1) {
      throw new Error("Veuillez renseigner l’adresse.");
    }

    if (shippingMethod !== "pickup" && !values.shippingPostalCode) {
      throw new Error("Veuillez renseigner le code postal.");
    }

    if (shippingMethod !== "pickup" && !values.shippingCity) {
      throw new Error("Veuillez renseigner la ville.");
    }

    if (shippingMethod !== "pickup" && !values.shippingCountry) {
      throw new Error("Veuillez renseigner le pays.");
    }

    if (!values.shippingEmail) {
      throw new Error("Veuillez renseigner l’email de livraison.");
    }

    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.shippingEmail);
    if (!emailIsValid) {
      throw new Error("Veuillez renseigner un email valide.");
    }
  }

  const handleCheckout = async () => {
    if (!currentUserId) {
      alert("Utilisateur introuvable.");
      return;
    }

    if (cartItemsWithProducts.length === 0) {
      alert("Votre panier est vide.");
      return;
    }

    if (!availableShippingMethods.includes(shippingMethod)) {
      alert("Ce mode de livraison n'est pas disponible pour cet artiste.");
      return;
    }

    const currentShippingValues = getShippingFormValues();

    try {
      validateShippingForm(currentShippingValues);
    } catch (err: any) {
      alert(err.message);
      return;
    }

    setShippingForm(currentShippingValues);
    setIsProcessing(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message || "Session utilisateur introuvable.");
      }

      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Utilisateur non authentifié.");
      }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          successUrl: `${window.location.origin}/checkout-success`,
          cancelUrl: `${window.location.origin}/checkout`,
          shippingMethod,
          shippingName: currentShippingValues.shippingName,
          shippingAddressLine1: currentShippingValues.shippingAddressLine1,
          shippingAddressLine2: currentShippingValues.shippingAddressLine2,
          shippingPostalCode: currentShippingValues.shippingPostalCode,
          shippingCity: currentShippingValues.shippingCity,
          shippingCountry: currentShippingValues.shippingCountry,
          shippingEmail: currentShippingValues.shippingEmail,
          shippingPhone: currentShippingValues.shippingPhone,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        const errorMessage =
          typeof data?.error === "string"
            ? data.error
            : error.message || "Impossible de créer la session Stripe.";

        throw new Error(errorMessage);
      }

      const redirectUrl = data?.url;

      if (!redirectUrl) {
        throw new Error("URL Stripe introuvable.");
      }

      window.location.href = redirectUrl;
    } catch (err: any) {
      console.error("Erreur création session Stripe:", err);
      alert(`Erreur Stripe: ${err.message}`);
      setIsProcessing(false);
      await fetchCheckoutItems();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-600">Chargement...</div>
      </div>
    );
  }

  if (cartItemsWithProducts.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-12">
          <Link
            href="/cart"
            className="mb-8 flex items-center gap-2 text-amber-600 hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au panier
          </Link>

          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-slate-900">Panier vide</h2>
            <p className="mb-6 text-slate-600">
              Ajoutez des articles avant de passer commande.
            </p>
            <Link
              href="/gallery"
              className="inline-flex rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
            >
              Retour à la galerie
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (availableShippingMethods.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-12">
          <Link
            href="/cart"
            className="mb-8 flex items-center gap-2 text-amber-600 hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au panier
          </Link>

          <div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-red-900">Livraison indisponible</h2>
            <p className="mb-3 text-red-800">
              Cet artiste n’a configuré aucun mode de livraison pour le moment.
            </p>
            <p className="text-red-700">
              Merci de réessayer plus tard ou de contacter la plateforme.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <Link
            href="/cart"
            className="mb-4 flex items-center gap-2 text-amber-600 hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au panier
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Paiement sécurisé</h1>
          <p className="mt-1 text-slate-600">Finalisez votre commande</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 rounded-3xl border border-amber-100 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
            Expérience d’achat premium
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Vous achetez une œuvre prête à être exposée
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Chaque commande correspond à une œuvre produite en version physique premium,
            fabriquée à la demande, préparée avec soin et livrée directement chez vous.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
              <PackageCheck className="h-4 w-4 text-amber-600" />
              Œuvre physique premium
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
              <BadgeCheck className="h-4 w-4 text-amber-600" />
              Fabrication à la demande
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
              <Truck className="h-4 w-4 text-amber-600" />
              Livraison directe
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <form ref={formRef}>
              <div className="mb-8 rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-6">
                  <h2 className="text-xl font-semibold text-slate-900">Mode de livraison</h2>
                </div>

                <div className="space-y-3 p-6">
                  {artistShippingSettings.shippingStandardEnabled && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 hover:border-amber-400">
                      <input
                        type="radio"
                        name="shippingMethod"
                        checked={shippingMethod === "standard"}
                        onChange={() => setShippingMethod("standard")}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">Livraison standard</p>
                            <p className="text-sm text-slate-600">
                              Livraison classique à domicile
                            </p>
                          </div>
                          <div className="text-right font-semibold text-slate-900">
                            {isFreeShipping
                              ? "Offerte"
                              : `${artistShippingSettings.shippingStandardPrice.toFixed(2)}€`}
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {artistShippingSettings.freeShippingThreshold > 0
                            ? `Offerte à partir de ${artistShippingSettings.freeShippingThreshold.toFixed(2)}€ d’achat.`
                            : "Pas de seuil de gratuité configuré."}
                        </p>
                      </div>
                    </label>
                  )}

                  {artistShippingSettings.shippingExpressEnabled && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 hover:border-amber-400">
                      <input
                        type="radio"
                        name="shippingMethod"
                        checked={shippingMethod === "express"}
                        onChange={() => setShippingMethod("express")}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">Livraison express</p>
                            <p className="text-sm text-slate-600">
                              Envoi prioritaire et plus rapide
                            </p>
                          </div>
                          <div className="text-right font-semibold text-slate-900">
                            {artistShippingSettings.shippingExpressPrice.toFixed(2)}€
                          </div>
                        </div>
                      </div>
                    </label>
                  )}

                  {artistShippingSettings.shippingPickupEnabled && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 hover:border-amber-400">
                      <input
                        type="radio"
                        name="shippingMethod"
                        checked={shippingMethod === "pickup"}
                        onChange={() => setShippingMethod("pickup")}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">Retrait sur place</p>
                            <p className="text-sm text-slate-600">
                              Retrait direct auprès de l’artiste ou du point prévu
                            </p>
                          </div>
                          <div className="text-right font-semibold text-slate-900">Gratuit</div>
                        </div>

                        {artistShippingSettings.pickupInstructions && (
                          <p className="mt-2 text-xs text-slate-500">
                            {artistShippingSettings.pickupInstructions}
                          </p>
                        )}
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="mb-8 rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-6">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {shippingMethod === "pickup"
                      ? "Informations de contact"
                      : "Adresse de livraison"}
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      name="shippingName"
                      autoComplete="name"
                      value={shippingForm.shippingName}
                      onChange={(e) => updateShippingField("shippingName", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500"
                      placeholder="Jean Dupont"
                    />
                  </div>

                  {shippingMethod !== "pickup" && (
                    <>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Adresse *
                        </label>
                        <input
                          type="text"
                          name="shippingAddressLine1"
                          autoComplete="street-address"
                          value={shippingForm.shippingAddressLine1}
                          onChange={(e) =>
                            updateShippingField("shippingAddressLine1", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500"
                          placeholder="10 rue Victor Hugo"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Complément d’adresse
                        </label>
                        <input
                          type="text"
                          name="shippingAddressLine2"
                          autoComplete="address-line2"
                          value={shippingForm.shippingAddressLine2}
                          onChange={(e) =>
                            updateShippingField("shippingAddressLine2", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500"
                          placeholder="Appartement, bâtiment, étage..."
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Code postal *
                        </label>
                        <input
                          type="text"
                          name="shippingPostalCode"
                          autoComplete="postal-code"
                          value={shippingForm.shippingPostalCode}
                          onChange={(e) =>
                            updateShippingField("shippingPostalCode", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500"
                          placeholder="75001"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Ville *
                        </label>
                        <input
                          type="text"
                          name="shippingCity"
                          autoComplete="address-level2"
                          value={shippingForm.shippingCity}
                          onChange={(e) => updateShippingField("shippingCity", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500"
                          placeholder="Paris"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Pays *
                        </label>
                        <input
                          type="text"
                          name="shippingCountry"
                          autoComplete="country-name"
                          value={shippingForm.shippingCountry}
                          onChange={(e) =>
                            updateShippingField("shippingCountry", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500"
                          placeholder="France"
                        />
                      </div>
                    </>
                  )}

                  <div className={shippingMethod === "pickup" ? "md:col-span-2" : ""}>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="shippingEmail"
                      autoComplete="email"
                      value={shippingForm.shippingEmail}
                      onChange={(e) => updateShippingField("shippingEmail", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500"
                      placeholder="jean@email.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Téléphone
                    </label>
                    <input
                      type="text"
                      name="shippingPhone"
                      autoComplete="tel"
                      value={shippingForm.shippingPhone}
                      onChange={(e) => updateShippingField("shippingPhone", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                </div>
              </div>
            </form>

            <div className="mb-8 rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-900">Résumé de la commande</h2>
              </div>
              <div className="space-y-4 p-6">
                {cartItemsWithProducts.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between border-b border-slate-100 pb-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{item.product.title}</p>
                      <p className="text-sm text-slate-600">Quantité : {item.quantity}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Produit fini premium, fabriqué à la demande
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900">
                      {(item.product.price * item.quantity).toFixed(2)}€
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-4 inline-flex items-center gap-2 text-amber-700">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">Ce que vous recevez</span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  Une œuvre imprimée en qualité premium
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  Production réalisée à la demande
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  Finitions soignées prêtes à être exposées
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  Livraison directe à votre adresse
                </div>
              </div>
            </div>

            <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="text-sm text-blue-900">
                  <p>
                    <strong>Vous allez être redirigé vers Stripe</strong> pour finaliser votre
                    paiement en toute sécurité.
                  </p>
                  <p className="mt-2">
                    Cette commande concerne un produit physique premium fabriqué après validation du paiement.
                  </p>
                  <p className="mt-2">
                    Pays desservis : {artistShippingSettings.shippingCountries}
                  </p>
                  <p className="mt-1">
                    Délai de préparation estimé : {artistShippingSettings.shippingProcessingDays}{" "}
                    jour{artistShippingSettings.shippingProcessingDays > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Livraison & production
              </h3>

              <p className="text-sm leading-7 text-slate-600">
                Chaque œuvre est produite après votre commande afin de garantir un rendu optimal.
                Le délai inclut la fabrication ainsi que la livraison sécurisée jusqu’à votre domicile.
              </p>
            </div>
          </div>

          <div>
            <div className="sticky top-4 rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900">Totaux</h2>
              </div>

              <div className="space-y-4 p-6">
                <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  Œuvre physique • Production à la demande • Livraison incluse selon option
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Sous-total</span>
                  <span>{subtotal.toFixed(2)}€</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Mode de livraison</span>
                  <span>
                    {shippingMethod === "standard" && "Standard"}
                    {shippingMethod === "express" && "Express"}
                    {shippingMethod === "pickup" && "Retrait"}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Livraison</span>
                  <span>
                    {shippingMethod === "pickup"
                      ? "Gratuite"
                      : isFreeShipping
                      ? "Offerte"
                      : `${shippingCost.toFixed(2)}€`}
                  </span>
                </div>

                {shippingMethod === "standard" &&
                  artistShippingSettings.freeShippingThreshold > 0 && (
                    <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                      {isFreeShipping
                        ? `La livraison standard est offerte à partir de ${artistShippingSettings.freeShippingThreshold.toFixed(
                            2
                          )}€ d’achat.`
                        : `Ajoutez encore ${Math.max(
                            0,
                            artistShippingSettings.freeShippingThreshold - subtotal
                          ).toFixed(2)}€ pour obtenir la livraison standard offerte.`}
                    </div>
                  )}

                {shippingMethod === "pickup" && artistShippingSettings.pickupInstructions && (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {artistShippingSettings.pickupInstructions}
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Commission plateforme</span>
                  <span>-{commission.toFixed(2)}€</span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-4 text-lg font-bold text-slate-900">
                  <span>Total à payer</span>
                  <span className="text-amber-600">{total.toFixed(2)}€</span>
                </div>

                <button
                  type="button"
                  className="mt-6 w-full rounded-lg bg-amber-600 px-4 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="inline-flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirection...
                    </span>
                  ) : (
                    "Payer avec Stripe"
                  )}
                </button>

                <p className="mt-3 text-center text-xs text-slate-500">
                  Paiement sécurisé. Votre œuvre est produite uniquement après validation de la commande.
                </p>

                <p className="mt-2 text-center text-xs text-slate-500">
                  Le paiement sera effectué sur la page sécurisée de Stripe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}