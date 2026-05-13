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
        // Reset monthly credits if needed
        const now = new Date();
        const resetDate = user.creditsReset;
        if (!resetDate || now > resetDate) {
          // Credits will be reset — handled in generate step
        } else if (user.creditsUsed >= limits.max) {
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
        const toneLabels: Record<string, string> = {
          professional: "professionnel et formel",
          casual: "décontracté et accessible",
          academic: "académique et rigoureux",
          creative: "créatif et engageant",
          motivational: "motivant et inspirant",
        };
        const toneDesc = toneLabels[ebook.tone] || ebook.tone;

        // Step 1: Generate chapter titles outline
        const outlineResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Tu es un expert en rédaction d'ebooks. Tu génères des plans structurés et détaillés. Réponds uniquement en JSON valide.`,
            },
            {
              role: "user",
              content: `Crée un plan détaillé pour un ebook intitulé "${ebook.title}" sur le sujet "${ebook.subject}".
L'ebook doit avoir exactement ${ebook.chapterCount} chapitres.
Langue : ${ebook.language}
Ton : ${toneDesc}

Réponds avec ce JSON exact (sans markdown) :
{
  "chapters": [
    { "number": 1, "title": "Titre du chapitre 1" },
    { "number": 2, "title": "Titre du chapitre 2" }
  ]
}`,
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

        // Step 2: Generate content for each chapter
        for (const ch of outline.chapters) {
          const chapterResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Tu es un expert en rédaction d'ebooks. Tu rédiges des chapitres complets, bien structurés et engageants. 
Ton : ${toneDesc}
Langue : ${ebook.language}
Utilise des sous-titres (##) pour structurer le contenu. Écris au minimum 600 mots par chapitre.`,
              },
              {
                role: "user",
                content: `Rédige le chapitre ${ch.number} de l'ebook "${ebook.title}".
Titre du chapitre : "${ch.title}"
Sujet global de l'ebook : ${ebook.subject}

Rédige un chapitre complet et détaillé avec introduction, développement structuré en sous-sections et conclusion du chapitre.`,
              },
            ],
          });

          const chapterContent = chapterResponse.choices[0]?.message?.content as string | null;
          if (!chapterContent) throw new Error(`Impossible de générer le chapitre ${ch.number}`);

          await createChapter({
            ebookId: input.ebookId,
            chapterNumber: ch.number,
            title: ch.title,
            content: chapterContent,
          });
        }

        // Step 3: Generate PDF
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

        // Increment credits
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
