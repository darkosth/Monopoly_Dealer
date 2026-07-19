import { describe, expect, it } from "vitest";
import { parseLanguage, validateCategoryInput, validateOptionInput } from "../../src/lib/heads-up/catalogValidation";

describe("Heads Up catalog validation", () => {
  it("accepts only supported languages", () => {
    expect(parseLanguage("es")).toBe("es");
    expect(parseLanguage("en")).toBe("en");
    expect(parseLanguage("fr")).toBe("es");
  });

  it("requires both category translations", () => {
    expect(validateCategoryInput({ nameEs: "Animales", nameEn: "Animals" })).toMatchObject({ ok: true });
    expect(validateCategoryInput({ nameEs: "Animales", nameEn: "" })).toMatchObject({ ok: false });
  });

  it("validates translations and optional HTTPS images", () => {
    expect(validateOptionInput({ textEs: "León", textEn: "Lion", imageUrl: "https://example.com/lion.jpg" })).toMatchObject({ ok: true });
    expect(validateOptionInput({ textEs: "León", textEn: "", imageUrl: "javascript:alert(1)" })).toMatchObject({ ok: false });
  });
});
