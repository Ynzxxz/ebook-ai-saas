/**
 * Prédéfinis de personnalisation pour les ebooks
 * Chaque template contient une combinaison de styles cohérente
 */

export interface StylingTemplate {
  id: string;
  name: string;
  description: string;
  coverStyle: "modern" | "minimal" | "professional" | "colorful";
  backgroundColor: "solid" | "gradient" | "texture";
  pageLayout: "single" | "double";
  marginSize: "compact" | "normal" | "spacious";
  lineHeight: "tight" | "normal" | "loose";
  pageNumbering: "arabic" | "roman" | "none";
  hasWatermark: boolean;
  headerText?: string;
  footerText?: string;
}

export const STYLING_TEMPLATES: Record<string, StylingTemplate> = {
  modern: {
    id: "modern",
    name: "Moderne",
    description: "Design épuré et contemporain avec accent vibrant",
    coverStyle: "modern",
    backgroundColor: "gradient",
    pageLayout: "single",
    marginSize: "normal",
    lineHeight: "normal",
    pageNumbering: "arabic",
    hasWatermark: false,
    footerText: "EbookAI Studio",
  },

  minimal: {
    id: "minimal",
    name: "Minimaliste",
    description: "Design épuré avec typographie classique",
    coverStyle: "minimal",
    backgroundColor: "solid",
    pageLayout: "single",
    marginSize: "spacious",
    lineHeight: "loose",
    pageNumbering: "none",
    hasWatermark: false,
  },

  professional: {
    id: "professional",
    name: "Professionnel",
    description: "Design formel avec en-têtes et pieds de page",
    coverStyle: "professional",
    backgroundColor: "solid",
    pageLayout: "double",
    marginSize: "normal",
    lineHeight: "normal",
    pageNumbering: "roman",
    hasWatermark: true,
    headerText: "Chapitre",
    footerText: "Page",
  },

  creative: {
    id: "creative",
    name: "Créatif",
    description: "Design vibrant avec couleurs et textures",
    coverStyle: "colorful",
    backgroundColor: "texture",
    pageLayout: "single",
    marginSize: "compact",
    lineHeight: "tight",
    pageNumbering: "arabic",
    hasWatermark: false,
  },

  academic: {
    id: "academic",
    name: "Académique",
    description: "Design formel pour publications académiques",
    coverStyle: "professional",
    backgroundColor: "solid",
    pageLayout: "double",
    marginSize: "spacious",
    lineHeight: "loose",
    pageNumbering: "arabic",
    hasWatermark: true,
    headerText: "Titre",
    footerText: "Page",
  },

  elegant: {
    id: "elegant",
    name: "Élégant",
    description: "Design raffiné avec typographie classique",
    coverStyle: "professional",
    backgroundColor: "gradient",
    pageLayout: "single",
    marginSize: "spacious",
    lineHeight: "loose",
    pageNumbering: "roman",
    hasWatermark: false,
    footerText: "Édition",
  },

  compact: {
    id: "compact",
    name: "Compact",
    description: "Design optimisé pour minimiser l'espace",
    coverStyle: "minimal",
    backgroundColor: "solid",
    pageLayout: "double",
    marginSize: "compact",
    lineHeight: "tight",
    pageNumbering: "arabic",
    hasWatermark: false,
  },

  vibrant: {
    id: "vibrant",
    name: "Vibrant",
    description: "Design énergique avec couleurs éclatantes",
    coverStyle: "colorful",
    backgroundColor: "gradient",
    pageLayout: "single",
    marginSize: "normal",
    lineHeight: "normal",
    pageNumbering: "arabic",
    hasWatermark: false,
    footerText: "✦",
  },

  classic: {
    id: "classic",
    name: "Classique",
    description: "Design intemporel inspiré des livres traditionnels",
    coverStyle: "professional",
    backgroundColor: "solid",
    pageLayout: "double",
    marginSize: "spacious",
    lineHeight: "loose",
    pageNumbering: "roman",
    hasWatermark: true,
    headerText: "Chapitre",
    footerText: "Page",
  },

  tech: {
    id: "tech",
    name: "Tech",
    description: "Design moderne pour contenu technologique",
    coverStyle: "modern",
    backgroundColor: "solid",
    pageLayout: "single",
    marginSize: "normal",
    lineHeight: "normal",
    pageNumbering: "arabic",
    hasWatermark: false,
    footerText: "Code & Créativité",
  },
};

export function getTemplate(id: string): StylingTemplate | undefined {
  return STYLING_TEMPLATES[id];
}

export function getAllTemplates(): StylingTemplate[] {
  return Object.values(STYLING_TEMPLATES);
}
