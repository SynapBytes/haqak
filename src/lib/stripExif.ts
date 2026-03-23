/**
 * Strips EXIF metadata from image files by re-drawing on a canvas.
 * Returns a new File with no metadata. Non-image files pass through unchanged.
 */
export async function stripExifFromFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file); // fallback
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const ext = mimeType === "image/png" ? ".png" : ".jpg";
          const cleanName = file.name.replace(/\.[^.]+$/, ext);
          resolve(new File([blob], cleanName, { type: mimeType, lastModified: Date.now() }));
        },
        mimeType,
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

/** Strip EXIF from an array of files (images only, others pass through). */
export async function stripExifFromFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map(stripExifFromFile));
}
