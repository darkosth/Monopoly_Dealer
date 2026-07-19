import { describe, expect, it } from "vitest";
import { validateCatalogBatchInput } from "../../src/lib/heads-up/catalogValidation";

const category = {
  nameEs: "Animales",
  nameEn: "Animals",
  isActive: true,
  sortOrder: 0,
};

const option = {
  id: "option-1",
  textEs: "León",
  textEn: "Lion",
  imageUrl: "https://example.com/lion.jpg",
  isActive: true,
  sortOrder: 0,
};

describe("validateCatalogBatchInput", () => {
  it("accepts existing and new options in one category draft", () => {
    expect(validateCatalogBatchInput({
      category,
      options: [option, { ...option, id: undefined, textEs: "Tigre", textEn: "Tiger", sortOrder: 1 }],
    })).toMatchObject({
      ok: true,
      data: {
        category,
        options: [option, { textEs: "Tigre", textEn: "Tiger", sortOrder: 1 }],
      },
    });
  });

  it("rejects duplicate persisted option ids", () => {
    expect(validateCatalogBatchInput({ category, options: [option, { ...option }] })).toMatchObject({
      ok: false,
      error: "Option ids must be unique",
    });
  });

  it("rejects an invalid row without accepting a partial draft", () => {
    expect(validateCatalogBatchInput({
      category,
      options: [option, { ...option, id: "option-2", textEn: "", imageUrl: "javascript:alert(1)" }],
    })).toMatchObject({
      ok: false,
      error: "Option 2: Spanish and English text are required",
    });
  });

  it("limits a category draft to 500 options", () => {
    const options = Array.from({ length: 501 }, (_, index) => ({
      ...option,
      id: `option-${index}`,
      sortOrder: index,
    }));

    expect(validateCatalogBatchInput({ category, options })).toMatchObject({
      ok: false,
      error: "A category cannot contain more than 500 options",
    });
  });
});
