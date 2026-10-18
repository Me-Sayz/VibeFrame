import { MAX_REF_IMAGES, REF_MAX_SIDE, REF_QUALITY, type RefImage } from "@/lib/images";
import type { AssetLayer } from "@/types/assets";

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result);
      resolve(s.slice(s.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Gagal membaca gambar referensi."));
    reader.readAsDataURL(blob);
  });
}

export async function encodeReference(layer: AssetLayer): Promise<RefImage> {
  const src = layer.source;
  const k = Math.min(1, REF_MAX_SIDE / Math.max(src.width, src.height));
  const width = Math.max(1, Math.round(src.width * k));
  const height = Math.max(1, Math.round(src.height * k));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak bisa menyiapkan gambar referensi.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", REF_QUALITY));
  if (!blob) throw new Error(`Gambar referensi "${layer.name}" gagal disiapkan.`);
  return { mime: "image/jpeg", data: await toBase64(blob) };
}

export const encodeReferences = (layers: AssetLayer[]): Promise<RefImage[]> =>
  Promise.all(layers.slice(0, MAX_REF_IMAGES).map(encodeReference));
