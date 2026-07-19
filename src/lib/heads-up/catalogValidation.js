const cleanText = (value, maxLength) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export function parseLanguage(value) {
  return value === "en" ? "en" : "es";
}

export function validateCategoryInput(input = {}) {
  const data = {
    nameEs: cleanText(input.nameEs, 80),
    nameEn: cleanText(input.nameEn, 80),
    sortOrder: Number.isInteger(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
    isActive: input.isActive !== false,
  };
  if (!data.nameEs || !data.nameEn) return { ok: false, error: "Both translations are required" };
  return { ok: true, data };
}

export function validateOptionInput(input = {}) {
  const imageUrl = cleanText(input.imageUrl, 2048);
  const data = {
    textEs: cleanText(input.textEs, 120),
    textEn: cleanText(input.textEn, 120),
    imageUrl: imageUrl || null,
    sortOrder: Number.isInteger(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
    isActive: input.isActive !== false,
  };

  if (!data.textEs || !data.textEn) return { ok: false, error: "Both translations are required" };
  if (data.imageUrl) {
    try {
      if (new URL(data.imageUrl).protocol !== "https:") throw new Error("invalid protocol");
    } catch {
      return { ok: false, error: "Image URL must use HTTPS" };
    }
  }
  return { ok: true, data };
}
