import imageCompression from "browser-image-compression";

export interface CompressImageOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
}

const DEFAULT_OPTIONS: Required<CompressImageOptions> = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 1920,
};

export async function compressImageFile(
  file: File,
  options?: CompressImageOptions
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const compressed = await imageCompression(file, {
    maxSizeMB: opts.maxSizeMB,
    maxWidthOrHeight: opts.maxWidthOrHeight,
    useWebWorker: true,
    fileType: "image/webp",
  });

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([compressed], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export async function compressLogoFile(file: File): Promise<File> {
  return compressImageFile(file, {
    maxSizeMB: 0.1,
    maxWidthOrHeight: 256,
  });
}
