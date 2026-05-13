import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import {
  createChapter,
  createEbook,
  getEbookById,
  getEbooksByUserId,
  getEbookWithChapters,
  getUserById,
  incrementUserCredits,
  updateEbook,
} from "../db";
import { generateEbookPdf } from "../pdfService";
import { PLAN_LIMITS } from "../stripe/products";
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
1. Rédige UNIQUEMENT le contenu de CE chapitre, pas des autres
2. Ne répète PAS le titre du chapitre en début de texte (il sera ajouté automatiquement)
3. Ne répète PAS le titre de l'ebook dans le texte
4. N'écris PAS "Chapitre X" ou "Introduction" comme premier mot
5. Commence directement par le contenu substantiel
6. Structure le contenu avec des sous-titres (## Sous-titre) pour organiser les idées
7. Chaque sous-section doit apporter une information nouvelle et distincte
8. Évite les répétitions de phrases ou d'idées au sein du même chapitre
9. Rédige entre 500 et 800 mots de contenu dense et utile
10. Termine par une transition naturelle vers le chapitre suivant (si ce n'est pas le dernier)

FORMAT DE SORTIE :
- Utilise ## pour les sous-titres de sections
- Utilise des paragraphes bien séparés (ligne vide entre chaque)
- N'utilise PAS de listes à puces (- ou *) — rédige en prose
- N'utilise PAS de texte en gras (**texte**) — le PDF le gérera
- Rédige directement en ${language}`;
}

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
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable" });

      const plan = user.plan ?? "free";
      const limits = PLAN_LIMITS[plan];

      // Check chapter limit
      if (input.chapterCount > limits.maxChapters) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Votre plan ${plan} autorise au maximum ${limits.maxChapters} chapitres.`,
        });
      }

      // Check credit limit
      if (plan === "free") {
        if (user.creditsUsed >= limits.max) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous avez atteint la limite de 3 ebooks gratuits. Passez à un plan payant pour continuer.",
          });
        }
      } else if (plan === "starter") {
        const now = new Date();
        const resetDate = user.creditsReset;
        if (resetDate && now <= resetDate && user.creditsUsed >= limits.max) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous avez atteint votre limite mensuelle de 20 ebooks. Passez au plan Pro pour un accès illimité.",
          });
        }
      }
      // Pro plan: unlimited, no check needed

      const hasWatermark = plan === "free";

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
              content: `Tu es un expert en rédaction d'ebooks. Tu génères des plans structurés. Réponds UNIQUEMENT en JSON valide, sans markdown ni texte autour.`,
            },
            {
              role: "user",
              content: buildOutlinePrompt(ebook.title, ebook.subject, ebook.chapterCount, ebook.language, toneDesc),
            },
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
                        number: { type: "integer" },
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

        const outlineContent = outlineResponse.choices[0]?.message?.content as string | null;
        if (!outlineContent) throw new Error("Impossible de générer le plan de l'ebook");

        const outline = JSON.parse(outlineContent) as { chapters: { number: number; title: string }[] };

        // Validate outline integrity
        if (!outline.chapters || outline.chapters.length !== ebook.chapterCount) {
          throw new Error(
            `Le plan généré contient ${outline.chapters?.length ?? 0} chapitres au lieu de ${ebook.chapterCount}`
          );
        }

        const allChapterTitles = outline.chapters.map((c) => c.title);

        // ── Step 2 : Generate content for each chapter ─────────────────────────
        for (const ch of outline.chapters) {
          const chapterResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Tu es un expert en rédaction d'ebooks professionnels. Tu rédiges des chapitres clairs, structurés et sans répétitions. Tu rédiges TOUJOURS en ${ebook.language}.`,
              },
              {
                role: "user",
                content: buildChapterPrompt(
                  ebook.title,
                  ebook.subject,
                  ebook.language,
                  toneDesc,
                  ch.number,
                  ch.title,
                  ebook.chapterCount,
                  allChapterTitles
                ),
              },
            ],
          });

          const rawContent = chapterResponse.choices[0]?.message?.content as string | null;
          if (!rawContent) throw new Error(`Impossible de générer le chapitre ${ch.number}`);

          // Clean content: remove any accidental title repetition at start
          const cleanContent = cleanChapterContent(rawContent, ch.title, ebook.title);

          await createChapter({
            ebookId: input.ebookId,
            chapterNumber: ch.number,
            title: ch.title,
            content: cleanContent,
          });
        }

        // ── Step 3 : Generate PDF ──────────────────────────────────────────────
        const ebookWithChapters = await getEbookWithChapters(input.ebookId);
        if (!ebookWithChapters) throw new Error("Ebook introuvable après génération");

        const { key, url } = await generateEbookPdf({
          ebookId: input.ebookId,
          title: ebook.title,
          subject: ebook.subject,
          language: ebook.language,
          tone: ebook.tone,
          chapters: ebookWithChapters.chapters,
          hasWatermark: ebook.hasWatermark,
        });

        await updateEbook(input.ebookId, { status: "completed", pdfKey: key, pdfUrl: url });
        await incrementUserCredits(ctx.user.id);

        return { success: true, pdfUrl: url };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        await updateEbook(input.ebookId, { status: "error", errorMessage: message });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  // ─── List user ebooks ──────────────────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    return getEbooksByUserId(ctx.user.id);
  }),

  // ─── Get single ebook with chapters ───────────────────────────────────────
  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const ebook = await getEbookWithChapters(input.id);
      if (!ebook) throw new TRPCError({ code: "NOT_FOUND" });
      if (ebook.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return ebook;
    }),
});

// ─── Content cleaning helpers ──────────────────────────────────────────────────

/**
 * Remove accidental repetitions of the chapter title or ebook title
 * that Claude sometimes inserts at the beginning of the content.
 */
function cleanChapterContent(content: string, chapterTitle: string, ebookTitle: string): string {
  let cleaned = content.trim();

  // Remove leading markdown heading that duplicates the chapter title
  const titleVariants = [
    `# ${chapterTitle}`,
    `## ${chapterTitle}`,
    `### ${chapterTitle}`,
    chapterTitle,
  ];
  for (const variant of titleVariants) {
    if (cleaned.startsWith(variant)) {
      cleaned = cleaned.slice(variant.length).trim();
      break;
    }
  }

  // Remove leading ebook title if Claude repeated it
  if (cleaned.startsWith(`# ${ebookTitle}`)) {
    cleaned = cleaned.slice(`# ${ebookTitle}`.length).trim();
  }

  // Remove "Chapitre X :" prefix patterns
  cleaned = cleaned.replace(/^Chapitre\s+\d+\s*[:\-–]\s*/i, "").trim();

  // Collapse excessive blank lines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Remove duplicate consecutive sentences (simple heuristic)
  cleaned = removeDuplicateSentences(cleaned);

  return cleaned;
}

/**
 * Detect and remove immediately repeated sentences within a paragraph.
 */
function removeDuplicateSentences(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  const cleanedParagraphs = paragraphs.map((para) => {
    // Split on sentence boundaries
    const sentences = para.split(/(?<=[.!?])\s+/);
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const sentence of sentences) {
      const normalized = sentence.trim().toLowerCase().replace(/\s+/g, " ");
      if (normalized.length < 10) {
        unique.push(sentence);
        continue;
      }
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(sentence);
      }
    }
    return unique.join(" ");
  });
  return cleanedParagraphs.join("\n\n");
}
