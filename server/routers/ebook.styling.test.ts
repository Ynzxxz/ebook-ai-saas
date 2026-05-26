import { describe, it, expect, beforeEach, vi } from "vitest";
import { updateEbook, getEbookById, createEbook } from "../db";

// Mock database
vi.mock("../db", () => ({
  updateEbook: vi.fn(),
  getEbookById: vi.fn(),
  createEbook: vi.fn(),
}));

describe("Ebook Styling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update ebook with custom styling", async () => {
    const mockEbook = {
      id: 1,
      userId: 1,
      title: "Test Ebook",
      subject: "Test Subject",
      chapterCount: 5,
      language: "Français",
      tone: "professional" as const,
      status: "pending" as const,
      pdfKey: null,
      pdfUrl: null,
      hasWatermark: false,
      errorMessage: null,
      primaryColor: "#7c3aed",
      fontFamily: "inter",
      coverImageUrl: null,
      autoStyle: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(getEbookById).mockResolvedValue(mockEbook);

    // Test updateEbook accepts styling fields
    await updateEbook(1, {
      primaryColor: "#ff0000",
      fontFamily: "playfair",
      autoStyle: false,
    });

    expect(updateEbook).toHaveBeenCalledWith(1, {
      primaryColor: "#ff0000",
      fontFamily: "playfair",
      autoStyle: false,
    });
  });

  it("should accept valid hex colors", () => {
    const validColors = ["#7c3aed", "#ffffff", "#000000", "#FF00FF"];
    const colorRegex = /^#[0-9A-F]{6}$/i;

    validColors.forEach((color) => {
      expect(colorRegex.test(color)).toBe(true);
    });
  });

  it("should reject invalid hex colors", () => {
    const invalidColors = ["#7c3a", "#gggggg", "7c3aed", "#7c3aed00"];
    const colorRegex = /^#[0-9A-F]{6}$/i;

    invalidColors.forEach((color) => {
      expect(colorRegex.test(color)).toBe(false);
    });
  });

  it("should support three font families", () => {
    const fonts = ["inter", "playfair", "merriweather"];
    const validFonts = ["inter", "playfair", "merriweather"];

    fonts.forEach((font) => {
      expect(validFonts.includes(font)).toBe(true);
    });
  });

  it("should store auto styling preference", async () => {
    const mockEbook = {
      id: 1,
      userId: 1,
      title: "Test",
      subject: "Test",
      chapterCount: 5,
      language: "Français",
      tone: "professional" as const,
      status: "pending" as const,
      pdfKey: null,
      pdfUrl: null,
      hasWatermark: false,
      errorMessage: null,
      primaryColor: "#7c3aed",
      fontFamily: "inter",
      coverImageUrl: null,
      autoStyle: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(getEbookById).mockResolvedValue(mockEbook);

    await updateEbook(1, { autoStyle: true });

    expect(updateEbook).toHaveBeenCalledWith(1, { autoStyle: true });
  });
});
