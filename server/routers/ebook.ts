import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import {
  addUserCredits,
  createChapter,
  createEbook,
  deductUserCredits,
  getEbookById,
  getEbooksByUserId,
  getEbookWithChapters,
  getUserById,
  getUserCreditsBalance,
  updateEbook,
  getTransactionsByUserId,
} from "../db";
import { generateEbookPdf } from "../pdfService";
import { protectedProcedure, router } from "../_core/trpc";

const toneEnum = z.enum(["professional", "casual", "academic", "creative", "motivational"]);

const TONE_LABELS: Record<string, string> = {
  professional: "professionnel et formel",
  casual: "décontracté et accessible",
  academic: "académique et rigoureux",
  creative: "créatif et engageant",
  motivational: "motivant et inspirant",
};

// ─── Prompt helpers ────────────────────────────────────────────────────────────

function buildOutlinePrompt(title: string, subject: string, chapterCount: number, language: string, toneDesc: string): string {
  return `Tu es un expert en rédaction d'ebooks professionnels. Ta mission est de créer un plan structuré pour un ebook.

EBOOK À PLANIFIER :
- Titre : "${title}"
- Sujet : "${subject}"
- Nombre de chapitres : EXACTEMENT ${chapterCount} (ni plus, ni moins)
- Langue : ${language}
- Ton : ${toneDesc}

RÈGLES STRICTES :
1. Génère EXACTEMENT ${chapterCount} chapitres numérotés de 1 à ${chapterCount}
2. Chaque titre de chapitre doit être unique, précis et différent des autres
3. Les chapitres doivent progresser logiquement du plus simple au plus complexe
4. Les titres doivent être concis (5 à 10 mots maximum)
5. Ne répète jamais le titre de l'ebook dans les titres de chapitres

Réponds UNIQUEMENT avec le JSON demandé, sans texte avant ni après.`;
}

function buildChapterPrompt(
  ebookTitle: string,
  subject: string,
  language: string,
  toneDesc: string,
  chapterNumber: number,
  chapterTitle: string,
  totalChapters: number,
  allChapterTitles: string[]
): string {
  const otherChapters = allChapterTitles
    .filter((_, i) => i !== chapterNumber - 1)
    .map((t, i) => `  - Chapitre ${i < chapterNumber - 1 ? i + 1 : i + 2} : ${t}`)
    .join("\n");

  return `Tu es un expert en rédaction d'ebooks professionnels. Tu rédiges le chapitre ${chapterNumber} sur ${totalChapters} d'un ebook.

CONTEXTE DE L'EBOOK :
- Titre de l'ebook : "${ebookTitle}"
- Sujet global : "${subject}"
- Langue : ${language}
- Ton : ${toneDesc}

CHAPITRE À RÉDIGER :
- Numéro : ${chapterNumber} / ${totalChapters}
- Titre : "${chapterTitle}"

AUTRES CHAPITRES DE L'EBOOK (pour éviter les répétitions) :
${otherChapters}

RÈGLES STRICTES DE RÉDACTION :
1. Rédige UNIQUEMENT le contenu du chapitre "${chapterTitle}", sans répéter le titre
2. Contenu : 800-1200 mots minimum, structuré en sections claires avec titres (##, ###)
3. Utilise du markdown : **gras**, listes à puces (-), listes numérotées (1., 2., 3.)
4. Ne mentionne JAMAIS les autres chapitres par leur titre exact
5. Sois cohérent avec le ton "${toneDesc}"
6. Pas de répétitions de phrases ou paragraphes
7. Termine par une conclusion partielle ou une transition vers le chapitre suivant

Réponds UNIQUEMENT avec le contenu markdown du chapitre, sans JSON, sans titre du chapitre.`;
}

// ─── Router ────────────────────────────────────────────────────────────────────

export const ebookRouter = router({
  // ─── Create & start generation ─────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        subject: z.string().min(1).max(500),
        chapterCount: z.number().int().min(1).max(30),
        language: z.string().min(1).max(64),
        tone: toneEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Le forfait gratuit est maintenant illimité - pas de vérification de crédits
      const hasWatermark = false; // Pas de filigrane

      const ebookId = await createEbook({
        userId: ctx.user.id,
        title: input.title,
        subject: input.subject,
        chapterCount: input.chapterCount,
        language: input.language,
        tone: input.tone,
        status: "pending",
        hasWatermark,
      });

      return { ebookId };
    }),

  // ─── Generate chapters ─────────────────────────────────────────────────────
  generate: protectedProcedure
    .input(z.object({ ebookId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const ebook = await getEbookById(input.ebookId);
      if (!ebook) throw new TRPCError({ code: "NOT_FOUND", message: "Ebook introuvable" });
      if (ebook.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (ebook.status === "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "Cet ebook est déjà généré." });

      await updateEbook(input.ebookId, { status: "generating" });

      try {
        const toneDesc = TONE_LABELS[ebook.tone] || ebook.tone;

        // ── Step 1 : Generate chapter outline (structured JSON) ────────────────
        const outlineResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Tu es un expert en rédaction d'ebooks. Réponds UNIQUEMENT avec du JSON valide, sans texte avant ni après.`,
            },
            { role: "user", content: buildOutlinePrompt(ebook.title, ebook.subject, ebook.chapterCount, ebook.language, toneDesc) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ebook_outline",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  chapters: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        number: { type: "number" },
                        title: { type: "string" },
                      },
                      required: ["number", "title"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["chapters"],
                additionalProperties: false,
              },
            },
          },
        });

        const outlineText = typeof outlineResponse.choices[0]?.message.content === "string"
          ? outlineResponse.choices[0].message.content
          : "";
        const outline = JSON.parse(outlineText);
        const chapterTitles = outline.chapters.map((c: any) => c.title);

        // ── Step 2 : Generate each chapter ──────────────────────────────────────
        for (let i = 0; i < ebook.chapterCount; i++) {
          const chapterNumber = i + 1;
          const chapterTitle = chapterTitles[i] || `Chapitre ${chapterNumber}`;

          const contentResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Tu es un expert en rédaction d'ebooks. Rédige le contenu en markdown structuré.`,
              },
              {
                role: "user",
                content: buildChapterPrompt(
                  ebook.title,
                  ebook.subject,
                  ebook.language,
                  toneDesc,
                  chapterNumber,
                  chapterTitle,
                  ebook.chapterCount,
                  chapterTitles
                ),
              },
            ],
          });

          const content = typeof contentResponse.choices[0]?.message.content === "string"
            ? contentResponse.choices[0].message.content
            : "";

          await createChapter({
            ebookId: input.ebookId,
            chapterNumber,
            title: chapterTitle,
            content,
          });
        }

        // ── Step 3 : Generate PDF ───────────────────────────────────────────────
        const ebookWithChapters = await getEbookWithChapters(input.ebookId);
        if (!ebookWithChapters) throw new Error("Ebook not found after generation");

        const { key, url } = await generateEbookPdf({
          ebookId: input.ebookId,
          title: ebookWithChapters.title,
          subject: ebookWithChapters.subject,
          language: ebookWithChapters.language,
          tone: ebookWithChapters.tone,
          chapters: ebookWithChapters.chapters,
          hasWatermark: false,
        });

        await updateEbook(input.ebookId, {
          status: "completed",
          pdfKey: key,
          pdfUrl: url,
        });

        // ── Step 4 : Deduct credit ──────────────────────────────────────────────
        // Crédits non déduits - le forfait gratuit est maintenant illimité

        return { success: true, pdfUrl: url };
      } catch (error) {
        console.error("[Ebook Generation] Error:", error);
        await updateEbook(input.ebookId, {
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Erreur inconnue",
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération de l'ebook",
        });
      }
    }),

  // ─── Get single ebook ──────────────────────────────────────────────────────
  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const ebook = await getEbookWithChapters(input.id);
      if (!ebook) throw new TRPCError({ code: "NOT_FOUND" });
      if (ebook.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return ebook;
    }),

  // ─── List user ebooks ──────────────────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    return getEbooksByUserId(ctx.user.id);
  }),

  // ─── Get user credits balance ──────────────────────────────────────────────
  getCreditsBalance: protectedProcedure.query(async ({ ctx }) => {
    const balance = await getUserCreditsBalance(ctx.user.id);
    return { balance };
  }),

  // ─── Get user transactions ────────────────────────────────────────────────────
  getTransactions: protectedProcedure.query(async ({ ctx }) => {
    return getTransactionsByUserId(ctx.user.id);
  }),

  // ─── Generate cover image with AI ──────────────────────────────────────────────
  generateCoverImage: protectedProcedure
    .input(
      z.object({
        ebookId: z.number().int(),
        subject: z.string().min(1),
        title: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ebook = await getEbookById(input.ebookId);
      if (!ebook) throw new TRPCError({ code: "NOT_FOUND", message: "Ebook introuvable" });
      if (ebook.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      try {
        const prompt = `Crée une couverture d'ebook professionnelle et attrayante pour:\nTitre: "${input.title}"\nSujet: "${input.subject}"\n\nLa couverture doit être moderne, avec une bonne hiérarchie visuelle et des couleurs harmonieuses.`;

        const { url } = await generateImage({ prompt });
        
        await updateEbook(input.ebookId, { coverImageUrl: url });
        
        return { success: true, imageUrl: url };
      } catch (error) {
        console.error("[Cover Generation] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération de l'image de couverture",
        });
      }
    }),

  // ─── Update ebook styling ──────────────────────────────────────────────────────
  updateStyling: protectedProcedure
    .input(
      z.object({
        ebookId: z.number().int(),
        primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        fontFamily: z.enum(["inter", "playfair", "merriweather"]).optional(),
        autoStyle: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ebook = await getEbookById(input.ebookId);
      if (!ebook) throw new TRPCError({ code: "NOT_FOUND", message: "Ebook introuvable" });
      if (ebook.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const updateData: any = {};
      if (input.primaryColor) updateData.primaryColor = input.primaryColor;
      if (input.fontFamily) updateData.fontFamily = input.fontFamily;
      if (input.autoStyle !== undefined) updateData.autoStyle = input.autoStyle;

      await updateEbook(input.ebookId, updateData);
      return { success: true };
    }),

  // ─── Get auto styling recommendation ────────────────────────────────────────────
  getAutoStyling: protectedProcedure
    .input(z.object({ subject: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Tu es un expert en design. Réponds UNIQUEMENT avec du JSON valide.",
            },
            {
              role: "user",
              content: `Pour un ebook sur le sujet "${input.subject}", recommande:\n1. Une couleur primaire (hex) qui convient au sujet\n2. Une police (inter, playfair, ou merriweather)\n\nRéponds avec JSON: {"color": "#XXXXXX", "font": "inter|playfair|merriweather"}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "styling_recommendation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  color: { type: "string" },
                  font: { type: "string" },
                },
                required: ["color", "font"],
                additionalProperties: false,
              },
            },
          },
        });

        const text = typeof response.choices[0]?.message.content === "string"
          ? response.choices[0].message.content
          : "{}";
        const recommendation = JSON.parse(text);

        return {
          primaryColor: recommendation.color || "#7c3aed",
          fontFamily: recommendation.font || "inter",
        };
      } catch (error) {
        console.error("[Auto Styling] Error:", error);
        return {
          primaryColor: "#7c3aed",
          fontFamily: "inter",
        };
      }
    }),

  // --- Update advanced styling ---
  updateAdvancedStyling: protectedProcedure
    .input(
      z.object({
        ebookId: z.number().int(),
        coverStyle: z.enum(["modern", "minimal", "professional", "colorful"]).optional(),
        coverBackgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        pageBackgroundStyle: z.enum(["solid", "gradient", "texture"]).optional(),
        pageBackgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        pageAccentColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        pageLayout: z.enum(["single", "double"]).optional(),
        marginSize: z.enum(["small", "normal", "large"]).optional(),
        lineHeight: z.enum(["1.5", "1.75", "2"]).optional(),
        watermarkText: z.string().max(256).optional(),
        watermarkOpacity: z.number().min(0).max(100).optional(),
        pageNumberingStyle: z.enum(["arabic", "roman", "none"]).optional(),
        pageNumberingPosition: z.enum(["bottom-center", "bottom-left", "bottom-right", "top-center"]).optional(),
        headerText: z.string().max(256).optional(),
        footerText: z.string().max(256).optional(),
        showChapterTitlesInHeader: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ebook = await getEbookById(input.ebookId);
      if (!ebook) throw new TRPCError({ code: "NOT_FOUND", message: "Ebook introuvable" });
      if (ebook.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const updateData: any = {};
      if (input.coverStyle) updateData.coverStyle = input.coverStyle;
      if (input.coverBackgroundColor) updateData.coverBackgroundColor = input.coverBackgroundColor;
      if (input.pageBackgroundStyle) updateData.pageBackgroundStyle = input.pageBackgroundStyle;
      if (input.pageBackgroundColor) updateData.pageBackgroundColor = input.pageBackgroundColor;
      if (input.pageAccentColor) updateData.pageAccentColor = input.pageAccentColor;
      if (input.pageLayout) updateData.pageLayout = input.pageLayout;
      if (input.marginSize) updateData.marginSize = input.marginSize;
      if (input.lineHeight) updateData.lineHeight = input.lineHeight;
      if (input.watermarkText !== undefined) updateData.watermarkText = input.watermarkText;
      if (input.watermarkOpacity !== undefined) updateData.watermarkOpacity = input.watermarkOpacity;
      if (input.pageNumberingStyle) updateData.pageNumberingStyle = input.pageNumberingStyle;
      if (input.pageNumberingPosition) updateData.pageNumberingPosition = input.pageNumberingPosition;
      if (input.headerText !== undefined) updateData.headerText = input.headerText;
      if (input.footerText !== undefined) updateData.footerText = input.footerText;
      if (input.showChapterTitlesInHeader !== undefined) updateData.showChapterTitlesInHeader = input.showChapterTitlesInHeader;

      await updateEbook(input.ebookId, updateData);
      return { success: true };
    }),
});
