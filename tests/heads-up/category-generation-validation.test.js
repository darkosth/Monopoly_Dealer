import { describe, expect, it } from "vitest";
import {
  validateGeneratedCategoryDraft,
  validateGenerationRequest,
} from "../../src/lib/heads-up/generationValidation";

const makeOptions = (count = 100) => Array.from({ length: count }, (_, index) => ({
  textEs: `Opción ${index + 1}`,
  textEn: `Option ${index + 1}`,
  imageUrl: null,
  isActive: true,
  sortOrder: index,
}));

describe("Heads Up category generation validation", () => {
  it("accepts and trims a bounded owner request", () => {
    expect(validateGenerationRequest({
      name: "  Animales marinos  ",
      explanation: "  Especies que viven en el océano.  ",
      instructions: "  Evita animales mitológicos.  ",
    })).toEqual({
      ok: true,
      data: {
        name: "Animales marinos",
        explanation: "Especies que viven en el océano.",
        instructions: "Evita animales mitológicos.",
      },
    });
  });

  it("requires a name and explanation and bounds custom instructions", () => {
    expect(validateGenerationRequest({ name: "", explanation: "Detalle" })).toMatchObject({ ok: false });
    expect(validateGenerationRequest({ name: "Tema", explanation: "" })).toMatchObject({ ok: false });
    expect(validateGenerationRequest({
      name: "Tema",
      explanation: "Detalle",
      instructions: "x".repeat(1201),
    })).toMatchObject({ ok: false });
  });

  it("accepts exactly 100 bilingual, active options without invented images", () => {
    expect(validateGeneratedCategoryDraft({
      category: { nameEs: "Animales", nameEn: "Animals", isActive: true, sortOrder: 0 },
      options: makeOptions(),
    })).toMatchObject({ ok: true, data: { options: { length: 100 } } });
  });

  it("rejects the wrong option count, duplicates, images, and inactive rows", () => {
    const category = { nameEs: "Animales", nameEn: "Animals", isActive: true, sortOrder: 0 };
    expect(validateGeneratedCategoryDraft({ category, options: makeOptions(99) })).toMatchObject({ ok: false });

    const duplicated = makeOptions();
    duplicated[1] = { ...duplicated[1], textEs: duplicated[0].textEs };
    expect(validateGeneratedCategoryDraft({ category, options: duplicated })).toMatchObject({ ok: false });

    const withImage = makeOptions();
    withImage[0] = { ...withImage[0], imageUrl: "https://example.com/image.jpg" };
    expect(validateGeneratedCategoryDraft({ category, options: withImage })).toMatchObject({ ok: false });

    const inactive = makeOptions();
    inactive[0] = { ...inactive[0], isActive: false };
    expect(validateGeneratedCategoryDraft({ category, options: inactive })).toMatchObject({ ok: false });
  });
});
