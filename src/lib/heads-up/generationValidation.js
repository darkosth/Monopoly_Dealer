import { validateCatalogBatchInput } from "./catalogValidation";

export const GENERATION_OPTION_COUNT = 100;

const normalize = (value) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLocaleLowerCase("en");

function boundedText(value, label, maxLength, required = true) {
  if (typeof value !== "string") return { ok: false, error: `${label} must be text` };
  const text = value.trim();
  if (required && !text) return { ok: false, error: `${label} is required` };
  if (text.length > maxLength) return { ok: false, error: `${label} cannot exceed ${maxLength} characters` };
  return { ok: true, data: text };
}

export function validateGenerationRequest(input = {}) {
  const name = boundedText(input.name, "Category name", 80);
  if (!name.ok) return name;
  const explanation = boundedText(input.explanation, "Category explanation", 600);
  if (!explanation.ok) return explanation;
  const instructions = boundedText(input.instructions ?? "", "Additional instructions", 1200, false);
  if (!instructions.ok) return instructions;

  return {
    ok: true,
    data: {
      name: name.data,
      explanation: explanation.data,
      instructions: instructions.data,
    },
  };
}

export function validateGeneratedCategoryDraft(input = {}) {
  const catalog = validateCatalogBatchInput(input);
  if (!catalog.ok) return catalog;
  if (catalog.data.options.length !== GENERATION_OPTION_COUNT) {
    return { ok: false, error: `A generated category must contain exactly ${GENERATION_OPTION_COUNT} options` };
  }
  if (!catalog.data.category.isActive) return { ok: false, error: "A generated category must be active" };

  const spanish = new Set();
  const english = new Set();
  for (const [index, option] of catalog.data.options.entries()) {
    if (option.imageUrl !== null) return { ok: false, error: `Option ${index + 1}: generated images must be null` };
    if (!option.isActive) return { ok: false, error: `Option ${index + 1}: generated options must be active` };

    const normalizedEs = normalize(option.textEs);
    const normalizedEn = normalize(option.textEn);
    if (spanish.has(normalizedEs) || english.has(normalizedEn)) {
      return { ok: false, error: `Option ${index + 1}: translations must be unique` };
    }
    spanish.add(normalizedEs);
    english.add(normalizedEn);
  }

  return {
    ok: true,
    data: {
      category: catalog.data.category,
      options: catalog.data.options.map((option, index) => ({
        ...option,
        imageUrl: null,
        isActive: true,
        sortOrder: index,
      })),
    },
  };
}
