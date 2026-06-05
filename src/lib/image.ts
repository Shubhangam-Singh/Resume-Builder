/**
 * Read an image File and return a downscaled JPEG data URL. Downscaling keeps
 * the stored/PDF-embedded image small (photos straight off a phone are huge),
 * which matters because it lives in IndexedDB and the exported PDF. Runs fully
 * in the browser.
 */
export async function fileToScaledDataUrl(
  file: File,
  maxDim = 400,
  quality = 0.85,
): Promise<string> {
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, w, h);

  // PNGs with transparency would get a black background as JPEG; only convert
  // when it actually shrinks things, otherwise keep the original data URL.
  try {
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return original;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
