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

export function validateCatalogBatchInput(input = {}) {
  const category = validateCategoryInput(input.category);
  if (!category.ok) return category;
  if (!Array.isArray(input.options)) return { ok: false, error: "Options must be an array" };
  if (input.options.length > 500) return { ok: false, error: "A category cannot contain more than 500 options" };

  const ids = input.options.map((option) => option?.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) return { ok: false, error: "Option ids must be unique" };

  const options = [];
  for (const [index, option] of input.options.entries()) {
    const result = validateOptionInput(option);
    if (!result.ok) {
      const detail = result.error === "Both translations are required"
        ? "Spanish and English text are required"
        : result.error;
      return { ok: false, error: `Option ${index + 1}: ${detail}` };
    }

    options.push({
      ...(typeof option.id === "string" && option.id ? { id: option.id } : {}),
      ...result.data,
    });
  }

  return { ok: true, data: { category: category.data, options } };
}
