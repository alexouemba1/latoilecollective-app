import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const PRODUCTS_BUCKET = "products";
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 78;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("");
  console.error("❌ Variables manquantes.");
  console.error("Ajoute dans ton terminal ou dans un fichier .env local :");
  console.error("SUPABASE_URL=...");
  console.error("SUPABASE_SERVICE_ROLE_KEY=...");
  console.error("");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function extractStoragePathFromPublicUrl(url, bucketName) {
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const index = parsed.pathname.indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function getPublicUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function buildOptimizedPath(productId, originalPath) {
  const originalFileName = originalPath.split("/").pop() || `product-${productId}`;
  const cleanBaseName = originalFileName.replace(/\.[^.]+$/, "");
  return `optimized/${productId}/${cleanBaseName}.webp`;
}

async function compressBuffer(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({
      width: MAX_WIDTH,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({
      quality: WEBP_QUALITY,
      effort: 4,
    })
    .toBuffer();
}

async function processProduct(product) {
  const originalImages = Array.isArray(product.images) ? product.images : [];

  if (originalImages.length === 0) {
    return { updated: false, skipped: true, reason: "Aucune image" };
  }

  const newImages = [];
  let changed = false;

  for (const imageUrl of originalImages) {
    if (typeof imageUrl !== "string" || !imageUrl.trim()) {
      continue;
    }

    const oldPath = extractStoragePathFromPublicUrl(imageUrl, PRODUCTS_BUCKET);

    if (!oldPath) {
      console.log(`⚠️ Produit ${product.id} : URL ignorée (path introuvable)`);
      newImages.push(imageUrl);
      continue;
    }

    if (oldPath.startsWith("optimized/")) {
      newImages.push(imageUrl);
      continue;
    }

    console.log(`📥 Produit ${product.id} : téléchargement ${oldPath}`);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(PRODUCTS_BUCKET)
      .download(oldPath);

    if (downloadError || !fileData) {
      console.log(
        `⚠️ Produit ${product.id} : téléchargement impossible -> ${downloadError?.message || "fichier introuvable"}`
      );
      newImages.push(imageUrl);
      continue;
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const outputBuffer = await compressBuffer(inputBuffer);
    const optimizedPath = buildOptimizedPath(product.id, oldPath);

    console.log(`📤 Produit ${product.id} : upload ${optimizedPath}`);

    const { error: uploadError } = await supabase.storage
      .from(PRODUCTS_BUCKET)
      .upload(optimizedPath, outputBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      console.log(`⚠️ Produit ${product.id} : upload impossible -> ${uploadError.message}`);
      newImages.push(imageUrl);
      continue;
    }

    const optimizedUrl = getPublicUrl(PRODUCTS_BUCKET, optimizedPath);
    newImages.push(optimizedUrl);
    changed = true;
  }

  if (!changed) {
    return { updated: false, skipped: true, reason: "Aucune image remplacée" };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ images: newImages })
    .eq("id", product.id);

  if (updateError) {
    throw new Error(`Produit ${product.id} : update DB impossible -> ${updateError.message}`);
  }

  return { updated: true, skipped: false, reason: "Images compressées" };
}

async function main() {
  console.log("🚀 Début compression anciennes images...");
  console.log("");

  const { data: products, error } = await supabase
    .from("products")
    .select("id, images")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Lecture produits impossible -> ${error.message}`);
  }

  const allProducts = Array.isArray(products) ? products : [];

  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const product of allProducts) {
    try {
      const result = await processProduct(product);

      if (result.updated) {
        updatedCount += 1;
        console.log(`✅ Produit ${product.id} : ${result.reason}`);
      } else {
        skippedCount += 1;
        console.log(`⏭️ Produit ${product.id} : ${result.reason}`);
      }
    } catch (err) {
      failedCount += 1;
      console.log(`❌ Produit ${product.id} : ${err.message}`);
    }

    console.log("");
  }

  console.log("------ RÉSUMÉ ------");
  console.log(`Produits mis à jour : ${updatedCount}`);
  console.log(`Produits ignorés    : ${skippedCount}`);
  console.log(`Produits en erreur  : ${failedCount}`);
  console.log("");
  console.log("✅ Fin du script.");
}

main().catch((err) => {
  console.error("");
  console.error("❌ Erreur globale :", err.message);
  console.error("");
  process.exit(1);
});