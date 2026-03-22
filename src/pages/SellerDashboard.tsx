import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Package,
  DollarSign,
  Image as ImageIcon,
  Upload,
  X,
  ShoppingBag,
  Calendar,
  User,
  Save,
  BadgeCheck,
  Archive,
  Truck,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type SellerProduct = {
  id: number;
  artistId: number | null;
  title: string;
  description: string | null;
  price: number;
  pictoremCost: number | null;
  category: string;
  stock: number;
  images: string[] | null;
  keywords: string[] | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type SaleRow = {
  id: number;
  orderId: number;
  productId: number;
  artistId: number;
  quantity: number;
  priceAtPurchase: number;
  createdAt?: string;
  productTitle: string;
  productCategory: string;
  productPictoremCost: number | null;
  orderStatus: string;
  orderDate: string;
};

type ArtistProfile = {
  id: number;
  userId: number;
  bio: string | null;
  profileImage: string | null;
  commissionRate?: number | null;
  isVerified?: boolean | null;
  stripeAccountId?: string | null;
  stripeOnboardingComplete?: boolean | null;
  isActive?: boolean | null;
  profileImagePositionX?: number | null;
  profileImagePositionY?: number | null;
  shippingStandardEnabled?: boolean | null;
  shippingExpressEnabled?: boolean | null;
  shippingPickupEnabled?: boolean | null;
  shippingStandardPrice?: number | null;
  shippingExpressPrice?: number | null;
  freeShippingThreshold?: number | null;
  shippingCountries?: string | null;
  shippingProcessingDays?: number | null;
  pickupInstructions?: string | null;
};

type ProfileForm = {
  bio: string;
  shippingStandardEnabled: boolean;
  shippingExpressEnabled: boolean;
  shippingPickupEnabled: boolean;
  shippingStandardPrice: string;
  shippingExpressPrice: string;
  freeShippingThreshold: string;
  shippingCountries: string;
  shippingProcessingDays: string;
  pickupInstructions: string;
};

const PLATFORM_COMMISSION_RATE = 0.1;
const ESTIMATED_PAYMENT_FEE_RATE = 0.03;
const MAX_IMAGES = 5;

/**
 * Compression image
 * - produits : largeur max 1600px
 * - profil artiste : largeur max 1200px
 * - conversion JPEG optimisée pour alléger le site
 */
const MAX_PRODUCT_IMAGE_WIDTH = 1600;
const MAX_PROFILE_IMAGE_WIDTH = 1200;
const IMAGE_QUALITY = 0.78;

const MIN_ABSOLUTE_MARGIN_EUR = 45;
const MIN_NET_MARGIN_AFTER_FEES_EUR = 35;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function normalizeKeywords(input: string): string[] {
  const rawParts = input
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  const uniqueKeywords: string[] = [];

  for (const keyword of rawParts) {
    const normalized = keyword.toLowerCase();
    const alreadyExists = uniqueKeywords.some(
      (existingKeyword) => existingKeyword.toLowerCase() === normalized
    );

    if (!alreadyExists) {
      uniqueKeywords.push(keyword);
    }
  }

  return uniqueKeywords.slice(0, 20);
}

function safeNumber(value: string | number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundPremiumPrice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;

  if (value < 100) {
    return Number((Math.ceil(value / 5) * 5 - 0.1).toFixed(2));
  }

  if (value < 300) {
    return Number((Math.ceil(value / 10) * 10 - 1).toFixed(2));
  }

  return Number((Math.ceil(value / 50) * 50 - 1).toFixed(2));
}

function getPricingMultiplier(pictoremCostEuro: number): number {
  if (!Number.isFinite(pictoremCostEuro) || pictoremCostEuro <= 0) return 0;

  if (pictoremCostEuro <= 25) return 3.2;
  if (pictoremCostEuro <= 40) return 2.9;
  if (pictoremCostEuro <= 60) return 2.55;
  if (pictoremCostEuro <= 90) return 2.3;
  if (pictoremCostEuro <= 130) return 2.1;
  if (pictoremCostEuro <= 180) return 1.95;
  if (pictoremCostEuro <= 260) return 1.82;
  return 1.72;
}

function calculateMinimumViablePrice(pictoremCostEuro: number): number {
  if (!Number.isFinite(pictoremCostEuro) || pictoremCostEuro <= 0) return 0;

  const targetFromAbsoluteMargin = pictoremCostEuro + MIN_ABSOLUTE_MARGIN_EUR;

  const targetFromNetAfterFees =
    (pictoremCostEuro + MIN_NET_MARGIN_AFTER_FEES_EUR) /
    (1 - PLATFORM_COMMISSION_RATE - ESTIMATED_PAYMENT_FEE_RATE);

  return Math.max(targetFromAbsoluteMargin, targetFromNetAfterFees);
}

function calculateSuggestedRetailPrice(pictoremCostEuro: number): number {
  if (!Number.isFinite(pictoremCostEuro) || pictoremCostEuro <= 0) return 0;

  const multiplier = getPricingMultiplier(pictoremCostEuro);
  const marketPositionedPrice = pictoremCostEuro * multiplier;
  const minimumViablePrice = calculateMinimumViablePrice(pictoremCostEuro);

  return roundPremiumPrice(Math.max(marketPositionedPrice, minimumViablePrice));
}

function estimateNetEarningsOnSale(salePrice: number, pictoremCost: number): number {
  if (!Number.isFinite(salePrice) || salePrice <= 0) return 0;

  const platformFee = salePrice * PLATFORM_COMMISSION_RATE;
  const paymentFee = salePrice * ESTIMATED_PAYMENT_FEE_RATE;

  return Number((salePrice - pictoremCost - platformFee - paymentFee).toFixed(2));
}

function formatEuro(value: number): string {
  return `${value.toFixed(2)}€`;
}

export default function SellerDashboard() {
  const [, setLocation] = useLocation();

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [archivingProductId, setArchivingProductId] = useState<number | null>(null);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [pictoremPricingLoading, setPictoremPricingLoading] = useState(false);

  const [artistId, setArtistId] = useState<number | null>(null);
  const [artistUserId, setArtistUserId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [artistName, setArtistName] = useState("Artiste");

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    bio: "",
    shippingStandardEnabled: true,
    shippingExpressEnabled: true,
    shippingPickupEnabled: false,
    shippingStandardPrice: "7.90",
    shippingExpressPrice: "14.90",
    freeShippingThreshold: "200",
    shippingCountries: "France",
    shippingProcessingDays: "3",
    pickupInstructions: "",
  });

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState("");
  const [profileImagePosition, setProfileImagePosition] = useState({
    x: 50,
    y: 50,
  });

  const dragAreaRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingProfileImage, setIsDraggingProfileImage] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [localPreviewUrls, setLocalPreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    pictoremCost: "",
    category: "Peinture",
    stock: "1",
    keywordsText: "",
  });

  const [isAutoPricingEnabled, setIsAutoPricingEnabled] = useState(true);

  async function loadArtistProfileByUserId(userId: number) {
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select(`
        id,
        userId,
        bio,
        profileImage,
        commissionRate,
        isVerified,
        stripeAccountId,
        stripeOnboardingComplete,
        isActive,
        profileImagePositionX,
        profileImagePositionY,
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
      .eq("userId", userId)
      .maybeSingle();

    if (artistError) {
      throw new Error(artistError.message);
    }

    if (!artist) {
      throw new Error("Profil artiste introuvable.");
    }

    const normalizedArtist: ArtistProfile = {
      id: Number(artist.id),
      userId: Number(artist.userId),
      bio: artist.bio ?? "",
      profileImage: artist.profileImage ?? "",
      commissionRate: artist.commissionRate ?? null,
      isVerified: artist.isVerified ?? false,
      stripeAccountId: artist.stripeAccountId ?? null,
      stripeOnboardingComplete: artist.stripeOnboardingComplete ?? false,
      isActive: artist.isActive ?? true,
      profileImagePositionX: Number(artist.profileImagePositionX ?? 50),
      profileImagePositionY: Number(artist.profileImagePositionY ?? 50),
      shippingStandardEnabled: artist.shippingStandardEnabled ?? true,
      shippingExpressEnabled: artist.shippingExpressEnabled ?? true,
      shippingPickupEnabled: artist.shippingPickupEnabled ?? false,
      shippingStandardPrice: Number(artist.shippingStandardPrice ?? 7.9),
      shippingExpressPrice: Number(artist.shippingExpressPrice ?? 14.9),
      freeShippingThreshold: Number(artist.freeShippingThreshold ?? 200),
      shippingCountries: artist.shippingCountries ?? "France",
      shippingProcessingDays: Number(artist.shippingProcessingDays ?? 3),
      pickupInstructions: artist.pickupInstructions ?? "",
    };

    setArtistProfile(normalizedArtist);
    setArtistId(normalizedArtist.id);
    setArtistUserId(normalizedArtist.userId);

    setProfileForm({
      bio: normalizedArtist.bio ?? "",
      shippingStandardEnabled: Boolean(normalizedArtist.shippingStandardEnabled ?? true),
      shippingExpressEnabled: Boolean(normalizedArtist.shippingExpressEnabled ?? true),
      shippingPickupEnabled: Boolean(normalizedArtist.shippingPickupEnabled ?? false),
      shippingStandardPrice: String(normalizedArtist.shippingStandardPrice ?? 7.9),
      shippingExpressPrice: String(normalizedArtist.shippingExpressPrice ?? 14.9),
      freeShippingThreshold: String(normalizedArtist.freeShippingThreshold ?? 200),
      shippingCountries: normalizedArtist.shippingCountries ?? "France",
      shippingProcessingDays: String(normalizedArtist.shippingProcessingDays ?? 3),
      pickupInstructions: normalizedArtist.pickupInstructions ?? "",
    });

    setProfileImagePreviewUrl(normalizedArtist.profileImage ?? "");
    setProfileImagePosition({
      x: Number(normalizedArtist.profileImagePositionX ?? 50),
      y: Number(normalizedArtist.profileImagePositionY ?? 50),
    });

    return normalizedArtist;
  }

  async function resolveCurrentArtistId() {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setLocation("/auth");
      return null;
    }

    const authUser = authData.user;
    setUserEmail(authUser.email ?? "");

    const { data: appUser, error: appUserError } = await supabase
      .from("users")
      .select("id, email, openId, name")
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

    setArtistName(appUser.name || appUser.email || "Artiste");

    const artist = await loadArtistProfileByUserId(appUser.id);
    return Number(artist.id);
  }

  async function fetchDashboardData() {
    setLoading(true);

    try {
      const currentArtistId = await resolveCurrentArtistId();

      if (!currentArtistId) {
        setProducts([]);
        setSales([]);
        setLoading(false);
        return;
      }

      setArtistId(currentArtistId);

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("artistId", currentArtistId)
        .order("createdAt", { ascending: false });

      if (productsError) {
        throw new Error(productsError.message);
      }

      const normalizedProducts: SellerProduct[] = (productsData || []).map((item: any) => ({
        id: item.id,
        artistId: item.artistId ?? null,
        title: item.title,
        description: item.description ?? "",
        price: Number(item.price ?? 0),
        pictoremCost:
          item.pictorem_cost === null || item.pictorem_cost === undefined
            ? null
            : Number(item.pictorem_cost),
        category: item.category ?? "Autre",
        stock: Number(item.stock ?? 0),
        images: Array.isArray(item.images) ? item.images : [],
        keywords: Array.isArray(item.keywords) ? item.keywords : [],
        isActive: Boolean(item.isActive),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      setProducts(normalizedProducts);

      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from("orderItems")
        .select("*")
        .eq("artistId", currentArtistId)
        .order("createdAt", { ascending: false });

      if (orderItemsError) {
        throw new Error(orderItemsError.message);
      }

      const orderItems = orderItemsData || [];

      if (orderItems.length === 0) {
        setSales([]);
        setLoading(false);
        return;
      }

      const productIds = [...new Set(orderItems.map((item: any) => item.productId))];
      const orderIds = [...new Set(orderItems.map((item: any) => item.orderId))];

      const [
        { data: linkedProducts, error: linkedProductsError },
        { data: ordersData, error: ordersError },
      ] = await Promise.all([
        supabase.from("products").select("id, title, category, pictorem_cost").in("id", productIds),
        supabase.from("orders").select("id, status, createdAt").in("id", orderIds),
      ]);

      if (linkedProductsError) {
        throw new Error(linkedProductsError.message);
      }

      if (ordersError) {
        throw new Error(ordersError.message);
      }

      const productMap = new Map<
        number,
        { title: string; category: string; pictoremCost: number | null }
      >();

      for (const product of linkedProducts || []) {
        productMap.set(product.id, {
          title: product.title ?? "Produit",
          category: product.category ?? "Autre",
          pictoremCost:
            product.pictorem_cost === null || product.pictorem_cost === undefined
              ? null
              : Number(product.pictorem_cost),
        });
      }

      const orderMap = new Map<number, { status: string; createdAt: string }>();
      for (const order of ordersData || []) {
        orderMap.set(order.id, {
          status: order.status ?? "pending",
          createdAt: order.createdAt ?? "",
        });
      }

      const normalizedSales: SaleRow[] = orderItems.map((item: any) => {
        const linkedProduct = productMap.get(item.productId);
        const linkedOrder = orderMap.get(item.orderId);

        return {
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          artistId: item.artistId,
          quantity: Number(item.quantity ?? 0),
          priceAtPurchase: Number(item.priceAtPurchase ?? 0),
          createdAt: item.createdAt,
          productTitle: linkedProduct?.title ?? "Produit supprimé",
          productCategory: linkedProduct?.category ?? "Autre",
          productPictoremCost: linkedProduct?.pictoremCost ?? null,
          orderStatus: linkedOrder?.status ?? "pending",
          orderDate: linkedOrder?.createdAt ?? item.createdAt ?? "",
        };
      });

      setSales(normalizedSales);
    } catch (err: any) {
      console.error("Erreur chargement dashboard vendeur:", err);
      alert(`Erreur dashboard: ${err.message}`);
      setProducts([]);
      setSales([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedFiles.length === 0) {
      setLocalPreviewUrls([]);
      return;
    }

    const urls = selectedFiles.map((file) => URL.createObjectURL(file));
    setLocalPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  useEffect(() => {
    if (!profileImageFile) return;

    const objectUrl = URL.createObjectURL(profileImageFile);
    setProfileImagePreviewUrl(objectUrl);
    setProfileImagePosition({ x: 50, y: 50 });

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [profileImageFile]);

  const totalProducts = products.length;

  const totalSalesCount = useMemo(() => {
    return sales.reduce((sum, sale) => sum + sale.quantity, 0);
  }, [sales]);

  const grossSalesAmount = useMemo(() => {
    return sales.reduce((sum, sale) => sum + sale.priceAtPurchase * sale.quantity, 0);
  }, [sales]);

  const totalArtistEarnings = useMemo(() => {
    return sales.reduce((sum, sale) => {
      const gross = sale.priceAtPurchase * sale.quantity;
      const pictoremCostUnit = sale.productPictoremCost ?? 0;
      const pictoremCostTotal = pictoremCostUnit * sale.quantity;

      return sum + estimateNetEarningsOnSale(gross, pictoremCostTotal);
    }, 0);
  }, [sales]);

  const soldProductIds = useMemo(() => {
    return new Set(sales.map((sale) => sale.productId));
  }, [sales]);

  const stripeStatusText = useMemo(() => {
    if (!artistProfile?.stripeAccountId) {
      return "Compte Stripe non connecté";
    }

    if (!artistProfile.stripeOnboardingComplete) {
      return "Onboarding Stripe en attente";
    }

    return "Compte Stripe prêt à recevoir des paiements";
  }, [artistProfile]);

  const artistActivityText = useMemo(() => {
    return artistProfile?.isActive === false ? "Activité suspendue" : "Activité active";
  }, [artistProfile]);

  const suggestedRetailPrice = useMemo(() => {
    return calculateSuggestedRetailPrice(safeNumber(formData.pictoremCost));
  }, [formData.pictoremCost]);

  const estimatedMargin = useMemo(() => {
    const price = safeNumber(formData.price);
    const pictoremCost = safeNumber(formData.pictoremCost);

    if (price <= 0 || pictoremCost <= 0) return 0;
    return Number((price - pictoremCost).toFixed(2));
  }, [formData.price, formData.pictoremCost]);

  const estimatedNetAfterFees = useMemo(() => {
    const price = safeNumber(formData.price);
    const pictoremCost = safeNumber(formData.pictoremCost);

    if (price <= 0 || pictoremCost <= 0) return 0;
    return estimateNetEarningsOnSale(price, pictoremCost);
  }, [formData.price, formData.pictoremCost]);

  const suggestedMultiplier = useMemo(() => {
    return getPricingMultiplier(safeNumber(formData.pictoremCost));
  }, [formData.pictoremCost]);

  const marginRatePercent = useMemo(() => {
    const price = safeNumber(formData.price);
    const pictoremCost = safeNumber(formData.pictoremCost);

    if (price <= 0 || pictoremCost <= 0) return 0;
    return Number((((price - pictoremCost) / price) * 100).toFixed(1));
  }, [formData.price, formData.pictoremCost]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      price: "",
      pictoremCost: "",
      category: "Peinture",
      stock: "1",
      keywordsText: "",
    });
    setSelectedFiles([]);
    setLocalPreviewUrls([]);
    setExistingImages([]);
    setEditingProductId(null);
    setIsAutoPricingEnabled(true);
  };

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      setSelectedFiles([]);
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length !== files.length) {
      alert("Veuillez sélectionner uniquement des fichiers image.");
      event.target.value = "";
      return;
    }

    if (editingProductId) {
      const totalCount = existingImages.length + imageFiles.length;
      if (totalCount > MAX_IMAGES) {
        alert(`Vous pouvez avoir au maximum ${MAX_IMAGES} images par œuvre.`);
        event.target.value = "";
        return;
      }
    } else if (imageFiles.length > MAX_IMAGES) {
      alert(`Vous pouvez téléverser au maximum ${MAX_IMAGES} images par œuvre.`);
      event.target.value = "";
      return;
    }

    setSelectedFiles(imageFiles);
  };

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setProfileImageFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image pour la photo de profil.");
      event.target.value = "";
      return;
    }

    setProfileImageFile(file);
  };

  const compressImage = async (
    file: File,
    options?: {
      maxWidth?: number;
      quality?: number;
    }
  ): Promise<File> => {
    if (!file.type.startsWith("image/")) {
      return file;
    }

    const maxWidth = options?.maxWidth ?? MAX_PRODUCT_IMAGE_WIDTH;
    const quality = options?.quality ?? IMAGE_QUALITY;

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Impossible de charger l’image."));
        img.src = src;
      });

    const objectUrl = URL.createObjectURL(file);

    try {
      const img = await loadImage(objectUrl);

      let targetWidth = img.width;
      let targetHeight = img.height;

      if (img.width > maxWidth) {
        const ratio = maxWidth / img.width;
        targetWidth = Math.round(img.width * ratio);
        targetHeight = Math.round(img.height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Impossible de préparer l’image.");
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error("Compression impossible."));
            }
          },
          "image/jpeg",
          quality
        );
      });

      const originalName = file.name.replace(/\.[^.]+$/, "");
      const compressedName = `${originalName}.jpg`;

      return new File([blob], compressedName, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const uploadImageToSupabase = async (file: File, folder = "products") => {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("Utilisateur non connecté");
    }

    const authUser = authData.user;

    const { data: appUser, error: appUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", authUser.email ?? "")
      .maybeSingle();

    if (appUserError) {
      throw new Error(appUserError.message);
    }

    if (!appUser) {
      throw new Error("Utilisateur introuvable");
    }

    const compressedFile = await compressImage(file, {
      maxWidth: folder === "artists" ? MAX_PROFILE_IMAGE_WIDTH : MAX_PRODUCT_IMAGE_WIDTH,
      quality: IMAGE_QUALITY,
    });

    const userId = String(appUser.id);
    const fileExt = "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(folder)
      .upload(filePath, compressedFile, {
        upsert: false,
        contentType: compressedFile.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from(folder).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const updateProfileImagePositionFromPointer = (clientX: number, clientY: number) => {
    const container = dragAreaRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);

    setProfileImagePosition({ x, y });
  };

  const handleProfilePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!profileImagePreviewUrl) return;

    setIsDraggingProfileImage(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateProfileImagePositionFromPointer(event.clientX, event.clientY);
  };

  const handleProfilePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingProfileImage) return;
    updateProfileImagePositionFromPointer(event.clientX, event.clientY);
  };

  const handleProfilePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingProfileImage(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleConnectStripe = async () => {
    if (!artistProfile?.id) {
      alert("Profil artiste introuvable.");
      return;
    }

    setStripeConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke("connect-stripe", {
        body: {
          artistId: artistProfile.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const redirectUrl = data?.url;

      if (!redirectUrl) {
        throw new Error("Lien Stripe introuvable.");
      }

      await fetchDashboardData();
      window.location.href = redirectUrl;
    } catch (err: any) {
      console.error("Erreur Stripe Connect:", err);
      alert(`Erreur Stripe: ${err.message}`);
    } finally {
      setStripeConnecting(false);
    }
  };

  const handleSuspendArtistActivity = async () => {
    if (!artistProfile?.id) {
      alert("Profil artiste introuvable.");
      return;
    }

    const confirmed = window.confirm(
      "Suspendre votre activité ? Votre profil artiste sera masqué et toutes vos œuvres seront désactivées. Vous pourrez réactiver votre activité plus tard."
    );

    if (!confirmed) return;

    setActivitySubmitting(true);

    try {
      const { error: artistError } = await supabase
        .from("artists")
        .update({ isActive: false })
        .eq("id", artistProfile.id)
        .eq("userId", artistProfile.userId);

      if (artistError) {
        throw new Error(artistError.message);
      }

      const { error: productsError } = await supabase
        .from("products")
        .update({ isActive: false })
        .eq("artistId", artistProfile.id);

      if (productsError) {
        throw new Error(productsError.message);
      }

      await fetchDashboardData();
      alert("Votre activité artiste est maintenant suspendue.");
    } catch (err: any) {
      console.error("Erreur suspension activité artiste:", err);
      alert(`Erreur suspension activité: ${err.message}`);
    } finally {
      setActivitySubmitting(false);
    }
  };

  const handleReactivateArtistActivity = async () => {
    if (!artistProfile?.id) {
      alert("Profil artiste introuvable.");
      return;
    }

    const confirmed = window.confirm(
      "Réactiver votre activité ? Votre profil artiste redeviendra visible. Vos œuvres resteront archivées tant que vous ne les réactivez pas manuellement."
    );

    if (!confirmed) return;

    setActivitySubmitting(true);

    try {
      const { error: artistError } = await supabase
        .from("artists")
        .update({ isActive: true })
        .eq("id", artistProfile.id)
        .eq("userId", artistProfile.userId);

      if (artistError) {
        throw new Error(artistError.message);
      }

      await fetchDashboardData();
      alert("Votre activité artiste est de nouveau active.");
    } catch (err: any) {
      console.error("Erreur réactivation activité artiste:", err);
      alert(`Erreur réactivation activité: ${err.message}`);
    } finally {
      setActivitySubmitting(false);
    }
  };

  const openCreateForm = () => {
    resetForm();
    setShowAddProduct(true);
  };

  const openEditForm = (product: SellerProduct) => {
    setEditingProductId(product.id);
    setFormData({
      title: product.title ?? "",
      description: product.description ?? "",
      price: String(product.price ?? ""),
      pictoremCost:
        product.pictoremCost === null || product.pictoremCost === undefined
          ? ""
          : String(product.pictoremCost),
      category: product.category ?? "Peinture",
      stock: String(product.stock ?? 1),
      keywordsText: Array.isArray(product.keywords) ? product.keywords.join(", ") : "",
    });
    setSelectedFiles([]);
    setExistingImages(Array.isArray(product.images) ? product.images.slice(0, MAX_IMAGES) : []);
    setIsAutoPricingEnabled(false);
    setShowAddProduct(true);
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveSelectedImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveProfileImage = () => {
    setProfileImageFile(null);
    setProfileImagePreviewUrl("");
    setProfileImagePosition({ x: 50, y: 50 });
  };

  const handleSaveArtistProfile = async () => {
    if (!artistProfile?.id || !artistUserId) {
      alert("Artiste introuvable.");
      return;
    }

    if (
      !profileForm.shippingStandardEnabled &&
      !profileForm.shippingExpressEnabled &&
      !profileForm.shippingPickupEnabled
    ) {
      alert("Veuillez activer au moins un mode de livraison.");
      return;
    }

    if (profileForm.shippingStandardEnabled && Number(profileForm.shippingStandardPrice) < 0) {
      alert("Le prix de la livraison standard est invalide.");
      return;
    }

    if (profileForm.shippingExpressEnabled && Number(profileForm.shippingExpressPrice) < 0) {
      alert("Le prix de la livraison express est invalide.");
      return;
    }

    if (Number(profileForm.freeShippingThreshold) < 0) {
      alert("Le seuil de livraison offerte est invalide.");
      return;
    }

    if (Number(profileForm.shippingProcessingDays) < 0) {
      alert("Le délai de préparation est invalide.");
      return;
    }

    setProfileSubmitting(true);

    try {
      let finalProfileImage = artistProfile?.profileImage ?? "";

      if (profileImageFile) {
        finalProfileImage = await uploadImageToSupabase(profileImageFile, "artists");
      }

      if (!profileImagePreviewUrl && !profileImageFile) {
        finalProfileImage = "";
      }

      const payload = {
        bio: profileForm.bio.trim(),
        profileImage: finalProfileImage || null,
        profileImagePositionX: Number(profileImagePosition.x.toFixed(2)),
        profileImagePositionY: Number(profileImagePosition.y.toFixed(2)),
        shippingstandardenabled: profileForm.shippingStandardEnabled,
        shippingexpressenabled: profileForm.shippingExpressEnabled,
        shippingpickupenabled: profileForm.shippingPickupEnabled,
        shippingstandardprice: Number(profileForm.shippingStandardPrice || 0),
        shippingexpressprice: Number(profileForm.shippingExpressPrice || 0),
        freeshippingthreshold: Number(profileForm.freeShippingThreshold || 0),
        shippingcountries: profileForm.shippingCountries.trim(),
        shippingprocessingdays: Number(profileForm.shippingProcessingDays || 0),
        pickupinstructions: profileForm.pickupInstructions.trim(),
      };

      const { data: updatedArtist, error } = await supabase
        .from("artists")
        .update(payload)
        .eq("id", artistProfile.id)
        .eq("userId", artistUserId)
        .select(`
          id,
          userId,
          bio,
          profileImage,
          commissionRate,
          isVerified,
          stripeAccountId,
          stripeOnboardingComplete,
          isActive,
          profileImagePositionX,
          profileImagePositionY,
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
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!updatedArtist) {
        throw new Error("Aucune ligne artiste mise à jour.");
      }

      const normalizedArtist: ArtistProfile = {
        id: Number(updatedArtist.id),
        userId: Number(updatedArtist.userId),
        bio: updatedArtist.bio ?? "",
        profileImage: updatedArtist.profileImage ?? "",
        commissionRate: updatedArtist.commissionRate ?? null,
        isVerified: updatedArtist.isVerified ?? false,
        stripeAccountId: updatedArtist.stripeAccountId ?? null,
        stripeOnboardingComplete: updatedArtist.stripeOnboardingComplete ?? false,
        isActive: updatedArtist.isActive ?? true,
        profileImagePositionX: Number(updatedArtist.profileImagePositionX ?? 50),
        profileImagePositionY: Number(updatedArtist.profileImagePositionY ?? 50),
        shippingStandardEnabled: updatedArtist.shippingStandardEnabled ?? true,
        shippingExpressEnabled: updatedArtist.shippingExpressEnabled ?? true,
        shippingPickupEnabled: updatedArtist.shippingPickupEnabled ?? false,
        shippingStandardPrice: Number(updatedArtist.shippingStandardPrice ?? 7.9),
        shippingExpressPrice: Number(updatedArtist.shippingExpressPrice ?? 14.9),
        freeShippingThreshold: Number(updatedArtist.freeShippingThreshold ?? 200),
        shippingCountries: updatedArtist.shippingCountries ?? "France",
        shippingProcessingDays: Number(updatedArtist.shippingProcessingDays ?? 3),
        pickupInstructions: updatedArtist.pickupInstructions ?? "",
      };

      setArtistProfile(normalizedArtist);
      setArtistId(normalizedArtist.id);
      setArtistUserId(normalizedArtist.userId);

      setProfileForm({
        bio: normalizedArtist.bio ?? "",
        shippingStandardEnabled: Boolean(normalizedArtist.shippingStandardEnabled ?? true),
        shippingExpressEnabled: Boolean(normalizedArtist.shippingExpressEnabled ?? true),
        shippingPickupEnabled: Boolean(normalizedArtist.shippingPickupEnabled ?? false),
        shippingStandardPrice: String(normalizedArtist.shippingStandardPrice ?? 7.9),
        shippingExpressPrice: String(normalizedArtist.shippingExpressPrice ?? 14.9),
        freeShippingThreshold: String(normalizedArtist.freeShippingThreshold ?? 200),
        shippingCountries: normalizedArtist.shippingCountries ?? "France",
        shippingProcessingDays: String(normalizedArtist.shippingProcessingDays ?? 3),
        pickupInstructions: normalizedArtist.pickupInstructions ?? "",
      });

      setProfileImageFile(null);
      setProfileImagePreviewUrl(normalizedArtist.profileImage ?? "");
      setProfileImagePosition({
        x: Number(normalizedArtist.profileImagePositionX ?? 50),
        y: Number(normalizedArtist.profileImagePositionY ?? 50),
      });

      alert("Profil artiste mis à jour.");
    } catch (err: any) {
      console.error("Erreur profil artiste:", err);
      alert(`Erreur profil artiste: ${err.message}`);
    } finally {
      setProfileSubmitting(false);
    }
  };

  async function fetchPictoremPrice() {
    setPictoremPricingLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Utilisateur non authentifié.");
      }

      const { data, error } = await supabase.functions.invoke("get-pictorem-price", {
        body: {
          quantity: 1,
          shippingCountry: "France",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const pictoremTotalEur = safeNumber(data?.converted?.totalEur);

      if (pictoremTotalEur <= 0) {
        throw new Error("Prix Pictorem invalide.");
      }

      const localSuggestedPrice = calculateSuggestedRetailPrice(pictoremTotalEur);

      setFormData((prev) => ({
        ...prev,
        pictoremCost: String(Number(pictoremTotalEur.toFixed(2))),
        price:
          isAutoPricingEnabled && localSuggestedPrice > 0
            ? String(Number(localSuggestedPrice.toFixed(2)))
            : prev.price,
      }));

      if (localSuggestedPrice > 0) {
        setIsAutoPricingEnabled(true);
      }
    } catch (err: any) {
      console.error("Erreur récupération prix Pictorem:", err);
      alert(`Erreur prix Pictorem: ${err.message}`);
    } finally {
      setPictoremPricingLoading(false);
    }
  }

  const handleSaveProduct = async () => {
    if (!formData.title.trim() || !formData.price.trim()) {
      alert("Veuillez remplir les champs requis.");
      return;
    }

    if (!artistId) {
      alert("Artiste introuvable.");
      return;
    }

    if (artistProfile?.isActive === false) {
      alert(
        "Votre activité est suspendue. Réactivez votre activité pour publier ou modifier des œuvres."
      );
      return;
    }

    if (safeNumber(formData.price) <= 0) {
      alert("Le prix de vente doit être supérieur à 0.");
      return;
    }

    if (
      formData.pictoremCost.trim() &&
      safeNumber(formData.price) <= safeNumber(formData.pictoremCost)
    ) {
      const confirmed = window.confirm(
        "Le prix de vente est inférieur ou égal au coût Pictorem renseigné. Vous risquez de vendre sans marge. Voulez-vous continuer ?"
      );

      if (!confirmed) {
        return;
      }
    }

    setSubmitting(true);

    try {
      let finalImages = [...existingImages];

      if (selectedFiles.length > 0) {
        const uploadedUrls: string[] = [];

        for (const file of selectedFiles.slice(0, MAX_IMAGES)) {
          const uploadedImageUrl = await uploadImageToSupabase(file);
          uploadedUrls.push(uploadedImageUrl);
        }

        finalImages = [...existingImages, ...uploadedUrls].slice(0, MAX_IMAGES);
      }

      const normalizedKeywords = normalizeKeywords(formData.keywordsText);
      const pictoremCostValue = formData.pictoremCost.trim()
        ? Number(safeNumber(formData.pictoremCost).toFixed(2))
        : null;

      if (editingProductId) {
        const payload = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          price: Number(formData.price),
          pictorem_cost: pictoremCostValue,
          category: formData.category,
          stock: Number(formData.stock),
          images: finalImages,
          keywords: normalizedKeywords,
        };

        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProductId)
          .eq("artistId", artistId);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const payload = {
          artistId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          price: Number(formData.price),
          pictorem_cost: pictoremCostValue,
          category: formData.category,
          stock: Number(formData.stock),
          images: finalImages,
          keywords: normalizedKeywords,
          isActive: true,
        };

        const { error } = await supabase.from("products").insert([payload]);

        if (error) {
          throw new Error(error.message);
        }
      }

      resetForm();
      setShowAddProduct(false);
      await fetchDashboardData();
    } catch (err: any) {
      console.error("Erreur enregistrement produit:", err);
      alert(`Erreur lors de l’enregistrement : ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveProduct = async (product: SellerProduct) => {
    if (!artistId) {
      alert("Artiste introuvable.");
      return;
    }

    if (!soldProductIds.has(product.id)) {
      alert("Cette œuvre n’a pas encore été vendue. Vous pouvez la supprimer normalement.");
      return;
    }

    if (!product.isActive) {
      alert("Cette œuvre est déjà archivée.");
      return;
    }

    const confirmed = window.confirm(
      "Archiver cette œuvre vendue ? Elle sera masquée de la galerie publique mais restera dans l’historique des ventes."
    );

    if (!confirmed) return;

    setArchivingProductId(product.id);

    try {
      const { error } = await supabase
        .from("products")
        .update({ isActive: false })
        .eq("id", product.id)
        .eq("artistId", artistId);

      if (error) {
        throw new Error(error.message);
      }

      await fetchDashboardData();
    } catch (err: any) {
      console.error("Erreur archivage produit:", err);
      alert(`Erreur lors de l’archivage: ${err.message}`);
    } finally {
      setArchivingProductId(null);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (soldProductIds.has(id)) {
      alert("Impossible de supprimer une œuvre déjà vendue. Archivez-la à la place.");
      return;
    }

    const confirmed = window.confirm("Supprimer cette œuvre ?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("artistId", artistId ?? -1);

    if (error) {
      console.error("Erreur suppression product:", error);
      alert(`Erreur lors de la suppression: ${error.message}`);
      return;
    }

    await fetchDashboardData();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation("/auth");
  };

  const previewImages = [...existingImages, ...localPreviewUrls].slice(0, MAX_IMAGES);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Tableau de bord vendeur</h1>
              <p className="mt-1 text-slate-600">
                Gérez vos œuvres, vos ventes et votre profil artiste
                {userEmail ? ` • ${userEmail}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/" className="text-amber-600 hover:text-amber-700">
                Retour à l&apos;accueil
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
              <Package className="h-4 w-4" />
              Œuvres publiées
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalProducts}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
              <DollarSign className="h-4 w-4" />
              Net artiste estimé
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {totalArtistEarnings.toFixed(2)}€
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
              <TrendingUp className="h-4 w-4" />
              Ventes réalisées
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalSalesCount}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
              <DollarSign className="h-4 w-4" />
              Chiffre brut
            </div>
            <p className="text-3xl font-bold text-slate-900">{grossSalesAmount.toFixed(2)}€</p>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <User className="h-6 w-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-slate-900">{artistName}</h2>
                {artistProfile?.isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-900">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Vérifié
                  </span>
                ) : null}
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    artistProfile?.isActive === false
                      ? "bg-red-100 text-red-900"
                      : "bg-blue-100 text-blue-900"
                  }`}
                >
                  {artistActivityText}
                </span>
              </div>
              <p className="text-slate-600">Profil public de l’artiste</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">Photo de profil</p>

              <div
                ref={dragAreaRef}
                className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${
                  profileImagePreviewUrl ? "cursor-grab touch-none" : ""
                } ${isDraggingProfileImage ? "cursor-grabbing" : ""}`}
                onPointerDown={handleProfilePointerDown}
                onPointerMove={handleProfilePointerMove}
                onPointerUp={handleProfilePointerUp}
                onPointerCancel={() => setIsDraggingProfileImage(false)}
                onPointerLeave={() => setIsDraggingProfileImage(false)}
              >
                {profileImagePreviewUrl ? (
                  <>
                    <img
                      src={profileImagePreviewUrl}
                      alt={artistName}
                      className="h-64 w-full select-none object-cover"
                      draggable={false}
                      style={{
                        objectPosition: `${profileImagePosition.x}% ${profileImagePosition.y}%`,
                      }}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/45 px-3 py-2 text-center text-xs font-medium text-white">
                      Glissez la photo pour la repositionner
                    </div>
                  </>
                ) : (
                  <div className="flex h-64 items-center justify-center text-slate-400">
                    <div className="text-center">
                      <ImageIcon className="mx-auto mb-2 h-10 w-10" />
                      <p className="text-sm">Aucune photo</p>
                    </div>
                  </div>
                )}
              </div>

              {profileImagePreviewUrl && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Position X : {Math.round(profileImagePosition.x)}% • Position Y :{" "}
                  {Math.round(profileImagePosition.y)}%
                </div>
              )}

              <div className="mt-4 space-y-3">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-slate-700 hover:bg-slate-50">
                  <Upload className="h-4 w-4" />
                  <span>{profileImageFile ? "Photo sélectionnée" : "Choisir une photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                </label>

                {(profileImagePreviewUrl || artistProfile?.profileImage) && (
                  <button
                    type="button"
                    onClick={handleRemoveProfileImage}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
                  >
                    Retirer l’aperçu
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Biographie de l’artiste
              </label>

              <textarea
                className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-3"
                rows={8}
                placeholder="Présentez votre univers, votre parcours, vos inspirations, vos techniques..."
                value={profileForm.bio}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    bio: e.target.value,
                  }))
                }
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Cette biographie et cette photo seront utilisées sur votre page artiste publique.
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Paiements Stripe</p>
                    <p className="mt-1 text-sm text-slate-600">{stripeStatusText}</p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      artistProfile?.stripeOnboardingComplete
                        ? "bg-green-100 text-green-900"
                        : artistProfile?.stripeAccountId
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {artistProfile?.stripeOnboardingComplete
                      ? "Prêt"
                      : artistProfile?.stripeAccountId
                        ? "À finaliser"
                        : "Non connecté"}
                  </span>
                </div>

                <p className="mb-4 text-sm text-slate-600">
                  La Toile Collective garde {(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%, Stripe
                  prend ses frais, puis le reste est envoyé sur votre compte connecté.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleConnectStripe}
                    disabled={stripeConnecting}
                    className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {stripeConnecting
                      ? "Connexion Stripe..."
                      : artistProfile?.stripeAccountId
                        ? "Continuer / rouvrir Stripe"
                        : "Connecter Stripe"}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Livraison</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Choisissez les modes proposés à vos clients et vos règles de livraison.
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">
                    Paramétrable
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-amber-600" />
                      <p className="font-medium text-slate-900">Modes activés</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={profileForm.shippingStandardEnabled}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              shippingStandardEnabled: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-sm font-medium text-slate-800">Standard</span>
                      </label>

                      <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={profileForm.shippingExpressEnabled}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              shippingExpressEnabled: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-sm font-medium text-slate-800">Express</span>
                      </label>

                      <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={profileForm.shippingPickupEnabled}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              shippingPickupEnabled: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-sm font-medium text-slate-800">
                          Retrait sur place
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Prix livraison standard (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={profileForm.shippingStandardPrice}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            shippingStandardPrice: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Prix livraison express (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={profileForm.shippingExpressPrice}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            shippingExpressPrice: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Livraison standard offerte dès (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={profileForm.freeShippingThreshold}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            freeShippingThreshold: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Délai de préparation (jours)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={profileForm.shippingProcessingDays}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            shippingProcessingDays: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Pays desservis
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="France, Belgique, Luxembourg..."
                      value={profileForm.shippingCountries}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          shippingCountries: e.target.value,
                        }))
                      }
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Saisissez les pays sous forme de texte simple, séparés par des virgules.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Instructions de retrait
                    </label>
                    <textarea
                      rows={4}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Précisez les conditions de retrait, horaires, prise de rendez-vous, lieu..."
                      value={profileForm.pickupInstructions}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          pickupInstructions: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Exemple recommandé : standard à 7,90 €, express à 14,90 €, livraison standard
                    offerte dès 200 €.
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Activité artiste</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {artistProfile?.isActive === false
                        ? "Votre profil public est masqué et vos œuvres ne sont plus actives."
                        : "Votre profil public est visible et vous pouvez vendre vos œuvres."}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      artistProfile?.isActive === false
                        ? "bg-red-100 text-red-900"
                        : "bg-blue-100 text-blue-900"
                    }`}
                  >
                    {artistProfile?.isActive === false ? "Suspendue" : "Active"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {artistProfile?.isActive === false ? (
                    <button
                      type="button"
                      onClick={handleReactivateArtistActivity}
                      disabled={activitySubmitting}
                      className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {activitySubmitting ? "Réactivation..." : "Réactiver mon activité"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSuspendArtistActivity}
                      disabled={activitySubmitting}
                      className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {activitySubmitting ? "Suspension..." : "Suspendre mon activité"}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-60"
                  onClick={handleSaveArtistProfile}
                  disabled={profileSubmitting}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {profileSubmitting ? "Enregistrement..." : "Enregistrer mon profil"}
                </button>

                <Link
                  href={artistId ? `/artist/${artistId}` : "/gallery"}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
                >
                  Voir ma page artiste
                </Link>
              </div>
            </div>
          </div>
        </div>

        {showAddProduct && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              {editingProductId ? "Modifier l’œuvre" : "Ajouter une nouvelle œuvre"}
            </h2>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Titre de l'œuvre"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />

              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                type="number"
                min="0"
                step="0.01"
                placeholder="Coût Pictorem TTC (€)"
                value={formData.pictoremCost}
                onChange={(e) => {
                  const pictoremCost = e.target.value;
                  const suggested = calculateSuggestedRetailPrice(safeNumber(pictoremCost));

                  setFormData((prev) => ({
                    ...prev,
                    pictoremCost,
                    price: isAutoPricingEnabled && suggested > 0 ? String(suggested) : prev.price,
                  }));
                }}
              />
            </div>

            <div className="mb-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={fetchPictoremPrice}
                disabled={pictoremPricingLoading}
                className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {pictoremPricingLoading ? "Calcul Pictorem..." : "Récupérer le prix Pictorem"}
              </button>

              <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                Le coût TTC Pictorem sera rempli automatiquement pour la configuration actuelle.
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                type="number"
                min="0"
                step="0.01"
                placeholder="Prix de vente (€)"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />

              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700">Prix automatique</span>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={isAutoPricingEnabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setIsAutoPricingEnabled(enabled);

                        if (enabled && suggestedRetailPrice > 0) {
                          setFormData((prev) => ({
                            ...prev,
                            price: String(suggestedRetailPrice),
                          }));
                        }
                      }}
                    />
                    Activer
                  </label>
                </div>

                <div className="text-sm text-slate-600">
                  Règle intelligente : multiplicateur premium progressif + marge minimale de
                  sécurité.
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Prix conseillé
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {suggestedRetailPrice > 0 ? formatEuro(suggestedRetailPrice) : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Prix de vente actuel
                  </p>
                  <p className="mt-1 text-xl font-bold text-amber-600">
                    {safeNumber(formData.price) > 0 ? formatEuro(safeNumber(formData.price)) : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Marge brute estimée
                  </p>
                  <p
                    className={`mt-1 text-xl font-bold ${
                      estimatedMargin > 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {safeNumber(formData.pictoremCost) > 0 && safeNumber(formData.price) > 0
                      ? formatEuro(estimatedMargin)
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Net estimé après frais
                  </p>
                  <p
                    className={`mt-1 text-xl font-bold ${
                      estimatedNetAfterFees > 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {safeNumber(formData.pictoremCost) > 0 && safeNumber(formData.price) > 0
                      ? formatEuro(estimatedNetAfterFees)
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (suggestedRetailPrice <= 0) {
                      alert("Renseignez d’abord un coût Pictorem valide.");
                      return;
                    }

                    setFormData((prev) => ({
                      ...prev,
                      price: String(suggestedRetailPrice),
                    }));
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Appliquer le prix conseillé
                </button>

                <div className="rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  Multiplicateur actuel : ×
                  {suggestedMultiplier > 0 ? suggestedMultiplier.toFixed(2) : "—"}
                </div>

                <div className="rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  Taux de marge brute : {marginRatePercent > 0 ? `${marginRatePercent}%` : "—"}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-slate-700">
                Objectif : rester premium, absorber les frais, conserver une vraie rentabilité et
                éviter de sous-vendre les œuvres fortes.
              </div>
            </div>

            <textarea
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">Mots-clés</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="batterie, solfège, rythme, musique"
                value={formData.keywordsText}
                onChange={(e) => setFormData({ ...formData, keywordsText: e.target.value })}
              />
              <p className="mt-2 text-xs text-slate-500">
                Séparez les mots-clés par des virgules. Exemple : batterie, jazz, partition,
                rythme.
              </p>
            </div>

            <div className="mb-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <ImageIcon className="h-4 w-4" />
                Images depuis votre ordinateur
              </label>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-slate-700 hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                <span>
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} image(s) sélectionnée(s)`
                    : editingProductId
                      ? `Ajouter des images (${existingImages.length}/${MAX_IMAGES})`
                      : "Choisir jusqu’à 5 images"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFilesChange}
                />
              </label>

              <p className="mt-2 text-xs text-slate-500">
                {editingProductId
                  ? "Vous pouvez ajouter quelques nouvelles images sans perdre les anciennes. Maximum 5 images au total."
                  : "Téléversez jusqu’à 5 images directement depuis votre ordinateur."}
              </p>
            </div>

            {previewImages.length > 0 && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-sm font-medium text-slate-700">Aperçu des images</p>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  {previewImages.map((img, index) => {
                    const isLocal = index >= existingImages.length;

                    return (
                      <div key={index} className="relative">
                        <img
                          src={img}
                          alt={`Aperçu ${index + 1}`}
                          className="h-28 w-full rounded-lg border border-slate-200 object-cover"
                        />

                        <button
                          className="absolute right-2 top-2 rounded-full bg-white p-1 text-slate-600 shadow hover:bg-slate-100"
                          type="button"
                          onClick={() => {
                            if (isLocal) {
                              handleRemoveSelectedImage(index - existingImages.length);
                            } else {
                              handleRemoveExistingImage(index);
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option>Peinture</option>
                <option>Sculpture</option>
                <option>Photographie</option>
                <option>Dessin</option>
                <option>Céramique</option>
                <option>Autre</option>
              </select>

              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                type="number"
                min="1"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <button
                className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-60"
                onClick={handleSaveProduct}
                disabled={submitting}
              >
                <Plus className="mr-2 h-4 w-4" />
                {submitting
                  ? "Enregistrement..."
                  : editingProductId
                    ? "Enregistrer les modifications"
                    : "Créer l'œuvre"}
              </button>

              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
                onClick={() => {
                  setShowAddProduct(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="mb-8 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Mes œuvres</h2>
              <p className="text-slate-600">Gérez vos produits en vente</p>
            </div>

            {!showAddProduct && artistProfile?.isActive !== false && (
              <button
                className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
                onClick={openCreateForm}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une œuvre
              </button>
            )}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="py-8 text-center text-slate-600">Chargement...</div>
            ) : products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left">Titre</th>
                      <th className="px-4 py-3 text-left">Catégorie</th>
                      <th className="px-4 py-3 text-left">Prix</th>
                      <th className="px-4 py-3 text-left">Coût Pictorem</th>
                      <th className="px-4 py-3 text-left">Marge brute</th>
                      <th className="px-4 py-3 text-left">Net estimé</th>
                      <th className="px-4 py-3 text-left">Stock</th>
                      <th className="px-4 py-3 text-left">Statut</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {products.map((product) => {
                      const isSold = soldProductIds.has(product.id);
                      const isArchiving = archivingProductId === product.id;
                      const margin =
                        product.pictoremCost && product.pictoremCost > 0
                          ? Number((product.price - product.pictoremCost).toFixed(2))
                          : null;
                      const netEstimated =
                        product.pictoremCost && product.pictoremCost > 0
                          ? estimateNetEarningsOnSale(product.price, product.pictoremCost)
                          : null;

                      return (
                        <tr
                          key={product.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{product.title}</div>

                            {Array.isArray(product.keywords) && product.keywords.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {product.keywords.map((keyword) => (
                                  <span
                                    key={`${product.id}-${keyword}`}
                                    className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{product.category}</td>
                          <td className="px-4 py-3 font-semibold text-amber-600">
                            {product.price.toFixed(2)}€
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {product.pictoremCost !== null
                              ? `${product.pictoremCost.toFixed(2)}€`
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-semibold ${
                                margin === null
                                  ? "text-slate-500"
                                  : margin > 0
                                    ? "text-green-600"
                                    : "text-red-500"
                              }`}
                            >
                              {margin === null ? "—" : `${margin.toFixed(2)}€`}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-semibold ${
                                netEstimated === null
                                  ? "text-slate-500"
                                  : netEstimated > 0
                                    ? "text-emerald-600"
                                    : "text-red-500"
                              }`}
                            >
                              {netEstimated === null ? "—" : `${netEstimated.toFixed(2)}€`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{product.stock}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                product.isActive
                                  ? "bg-green-100 text-green-900"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {product.isActive ? "Actif" : "Archivé"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                className="rounded p-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => openEditForm(product)}
                                title="Modifier cette œuvre"
                                disabled={artistProfile?.isActive === false}
                              >
                                <Edit2 className="h-4 w-4 text-amber-600" />
                              </button>

                              {isSold ? (
                                <button
                                  className="rounded p-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={() => handleArchiveProduct(product)}
                                  disabled={
                                    !product.isActive ||
                                    isArchiving ||
                                    artistProfile?.isActive === false
                                  }
                                  title={
                                    product.isActive
                                      ? "Archiver cette œuvre vendue"
                                      : "Œuvre déjà archivée"
                                  }
                                >
                                  <Archive className="h-4 w-4 text-slate-600" />
                                </button>
                              ) : (
                                <button
                                  className="rounded p-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  title="Supprimer cette œuvre"
                                  disabled={artistProfile?.isActive === false}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                <p className="mb-4 text-slate-600">Vous n&apos;avez pas encore créé d&apos;œuvres</p>
                {artistProfile?.isActive !== false && (
                  <button
                    className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
                    onClick={openCreateForm}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer votre première œuvre
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-semibold text-slate-900">Ventes réelles</h2>
            </div>
            <p className="mt-1 text-slate-600">Historique des commandes de vos œuvres</p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="py-8 text-center text-slate-600">Chargement...</div>
            ) : sales.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left">Œuvre</th>
                      <th className="px-4 py-3 text-left">Catégorie</th>
                      <th className="px-4 py-3 text-left">Qté</th>
                      <th className="px-4 py-3 text-left">Montant brut</th>
                      <th className="px-4 py-3 text-left">Coût Pictorem total</th>
                      <th className="px-4 py-3 text-left">Net artiste estimé</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Statut</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sales.map((sale) => {
                      const gross = sale.priceAtPurchase * sale.quantity;
                      const pictoremCostTotal =
                        sale.productPictoremCost !== null
                          ? Number((sale.productPictoremCost * sale.quantity).toFixed(2))
                          : null;
                      const artistGain =
                        pictoremCostTotal !== null
                          ? estimateNetEarningsOnSale(gross, pictoremCostTotal)
                          : Number(
                              (
                                gross -
                                gross * PLATFORM_COMMISSION_RATE -
                                gross * ESTIMATED_PAYMENT_FEE_RATE
                              ).toFixed(2)
                            );

                      return (
                        <tr key={sale.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {sale.productTitle}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{sale.productCategory}</td>
                          <td className="px-4 py-3 text-slate-600">{sale.quantity}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {gross.toFixed(2)}€
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {pictoremCostTotal !== null ? `${pictoremCostTotal.toFixed(2)}€` : "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-amber-600">
                            {artistGain.toFixed(2)}€
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div className="inline-flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {sale.orderDate
                                ? new Date(sale.orderDate).toLocaleDateString("fr-FR")
                                : "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                sale.orderStatus === "completed"
                                  ? "bg-green-100 text-green-900"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {sale.orderStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                <p className="mb-2 font-semibold text-slate-900">Aucune vente pour le moment</p>
                <p className="text-slate-600">
                  Vos ventes apparaîtront ici dès la première commande.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}