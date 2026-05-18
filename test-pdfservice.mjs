// Test direct du pdfService pour reproduire les pages blanches
// On simule exactement ce que le router ebook.ts envoie au service
import { createRequire } from "module";
import { register } from "node:module";
import path from "path";
import fs from "fs";

// On va lire le pdfService et le tester via tsx
// Plutôt, on va reproduire exactement la logique du pdfService ici
// en copiant le code et en remplaçant storagePut par une écriture locale

import PDFDocument from "pdfkit";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 72;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_H - 90;

const C = {
  pageBg: "#0f0f1a",
  coverBg: "#1a1a2e",
  accent: "#7c3aed",
  accentLight: "#a78bfa",
  accentLighter: "#c4b5fd",
  white: "#ffffff",
  textPrimary: "#e5e7eb",
  textSecondary: "#d1d5db",
  textDim: "#6b7280",
  separator: "#374151",
};

function addContentPage(doc, hasWatermark, wm) {
  doc.addPage({ size: "A4", margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
  doc.rect(0, 0, PAGE_W, PAGE_H).fillColor(C.pageBg).fillOpacity(1).fill();
  doc.rect(0, 0, PAGE_W, 6).fillColor(C.accent).fillOpacity(1).fill();
  if (hasWatermark) drawWatermark(doc, wm, 32);
  return 50;
}

function ensureSpace(doc, y, needed, hw, wm) {
  return y + needed > BOTTOM_LIMIT ? addContentPage(doc, hw, wm) : y;
}

function drawWatermark(doc, text, size) {
  doc.save();
  doc.fillColor(C.white).fillOpacity(0.04).font("Helvetica-Bold").fontSize(size);
  doc.rotate(-45, { origin: [PAGE_W / 2, PAGE_H / 2] });
  doc.text(text, 0, PAGE_H / 2 - size / 2, { align: "center", width: PAGE_W });
  doc.restore();
}

function stripInline(text) {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .trim();
}

function parseMarkdownBlocks(content) {
  const blocks = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let paraLines = [];
  let numberedIndex = 0;

  const flushPara = () => {
    const t = paraLines.join(" ").trim();
    if (t) blocks.push({ type: "paragraph", text: stripInline(t) });
    paraLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith("### ")) {
      flushPara();
      blocks.push({ type: "h3", text: stripInline(line.slice(4).trim()) });
      numberedIndex = 0;
    } else if (line.startsWith("## ")) {
      flushPara();
      blocks.push({ type: "h2", text: stripInline(line.slice(3).trim()) });
      numberedIndex = 0;
    } else if (line.startsWith("# ")) {
      flushPara();
      blocks.push({ type: "h1", text: stripInline(line.slice(2).trim()) });
      numberedIndex = 0;
    } else if (/^[-*•]\s+/.test(line)) {
      flushPara();
      const t = line.replace(/^[-*•]\s+/, "").trim();
      if (t) blocks.push({ type: "bullet", text: stripInline(t) });
      numberedIndex = 0;
    } else if (/^\d+\.\s+/.test(line)) {
      flushPara();
      numberedIndex++;
      const t = line.replace(/^\d+\.\s+/, "").trim();
      if (t) blocks.push({ type: "numbered", text: stripInline(t), index: numberedIndex });
    } else if (line.trim() === "") {
      flushPara();
      numberedIndex = 0;
    } else {
      paraLines.push(line);
    }
  }
  flushPara();
  return blocks.filter((b) => b.text.trim().length > 0);
}

function renderBlock(doc, block, y, hw, wm) {
  const { text } = block;
  if (!text) return y;

  switch (block.type) {
    case "h1": {
      y = ensureSpace(doc, y, 40, hw, wm);
      doc.fillColor(C.accentLighter).fillOpacity(1).font("Helvetica-Bold").fontSize(16);
      const h = doc.heightOfString(text, { width: CONTENT_W });
      doc.text(text, MARGIN, y, { width: CONTENT_W, lineGap: 2 });
      return y + h + 16;
    }
    case "h2": {
      y = ensureSpace(doc, y, 34, hw, wm);
      doc.rect(MARGIN, y + 1, 3, 14).fillColor(C.accent).fillOpacity(1).fill();
      doc.fillColor(C.accentLight).fillOpacity(1).font("Helvetica-Bold").fontSize(13);
      const h = doc.heightOfString(text, { width: CONTENT_W - 12 });
      doc.text(text, MARGIN + 10, y, { width: CONTENT_W - 12, lineGap: 2 });
      return y + h + 14;
    }
    case "h3": {
      y = ensureSpace(doc, y, 28, hw, wm);
      doc.fillColor(C.accentLighter).fillOpacity(1).font("Helvetica-Bold").fontSize(11);
      const h = doc.heightOfString(text, { width: CONTENT_W });
      doc.text(text, MARGIN, y, { width: CONTENT_W, lineGap: 2 });
      return y + h + 12;
    }
    case "paragraph": {
      doc.font("Helvetica").fontSize(11);
      const h = doc.heightOfString(text, { width: CONTENT_W, lineGap: 4 });
      if (y + h > BOTTOM_LIMIT && h < BOTTOM_LIMIT - 60) {
        y = addContentPage(doc, hw, wm);
      }
      doc.fillColor(C.textSecondary).fillOpacity(1).font("Helvetica").fontSize(11);
      doc.text(text, MARGIN, y, { width: CONTENT_W, lineGap: 4 });
      return y + h + 12;
    }
    case "bullet": {
      doc.font("Helvetica").fontSize(11);
      const h = doc.heightOfString(text, { width: CONTENT_W - 18, lineGap: 3 });
      y = ensureSpace(doc, y, h + 6, hw, wm);
      doc.fillColor(C.accent).fillOpacity(1).circle(MARGIN + 5, y + 6, 2.5).fill();
      doc.fillColor(C.textSecondary).fillOpacity(1).font("Helvetica").fontSize(11);
      doc.text(text, MARGIN + 14, y, { width: CONTENT_W - 18, lineGap: 3 });
      return y + h + 6;
    }
    case "numbered": {
      doc.font("Helvetica").fontSize(11);
      const h = doc.heightOfString(text, { width: CONTENT_W - 26, lineGap: 3 });
      y = ensureSpace(doc, y, h + 6, hw, wm);
      const numStr = `${block.index ?? "1"}.`;
      doc.fillColor(C.accent).fillOpacity(1).font("Helvetica-Bold").fontSize(11);
      doc.text(numStr, MARGIN, y, { width: 20, lineGap: 3 });
      doc.fillColor(C.textSecondary).fillOpacity(1).font("Helvetica").fontSize(11);
      doc.text(text, MARGIN + 24, y, { width: CONTENT_W - 26, lineGap: 3 });
      return y + h + 6;
    }
  }
  return y;
}

// Contenu simulant ce que Claude génère réellement (avec markdown)
const chapters = [
  {
    chapterNumber: 1,
    title: "Les Fondements du Marketing Digital",
    content: `## Introduction au marketing digital

Le marketing digital représente l'ensemble des techniques et stratégies utilisées pour promouvoir des produits ou services via les canaux numériques. Cette discipline englobe une multitude d'approches, depuis le référencement naturel jusqu'aux campagnes publicitaires payantes, en passant par les réseaux sociaux et le marketing par email.

## Les piliers fondamentaux

La réussite d'une stratégie de marketing digital repose sur plusieurs piliers essentiels. Le premier est la **compréhension de l'audience cible**, qui nécessite une analyse approfondie des comportements, des préférences et des habitudes de consommation de vos clients potentiels.

Le deuxième pilier est la **présence en ligne cohérente**. Votre marque doit être visible et reconnaissable sur tous les canaux numériques que vous utilisez. Cette cohérence renforce la confiance des consommateurs et améliore la mémorabilité de votre marque.

## Les outils indispensables

Pour mettre en œuvre une stratégie efficace, plusieurs outils sont indispensables :

- Google Analytics pour mesurer le trafic et le comportement des visiteurs
- Les plateformes de gestion des réseaux sociaux comme Hootsuite ou Buffer
- Les outils d'email marketing comme Mailchimp ou SendGrid
- Les solutions de CRM pour gérer les relations clients

## Conclusion du chapitre

En maîtrisant ces fondements, vous disposez d'une base solide pour développer votre présence digitale et atteindre vos objectifs marketing avec efficacité et précision.`
  },
  {
    chapterNumber: 2,
    title: "Stratégies de Contenu et SEO",
    content: `## L'importance du contenu de qualité

Dans l'écosystème digital actuel, le contenu est roi. Une stratégie de contenu bien pensée permet non seulement d'attirer des visiteurs qualifiés vers votre site, mais aussi de les convertir en clients fidèles. La création de contenu pertinent et de valeur est au cœur de toute approche marketing réussie.

## Les principes du SEO moderne

Le référencement naturel, ou SEO (Search Engine Optimization), est l'ensemble des techniques visant à améliorer la visibilité d'un site web dans les résultats des moteurs de recherche. Les algorithmes de Google ont considérablement évolué ces dernières années, privilégiant désormais la qualité du contenu et l'expérience utilisateur.

### Les facteurs de classement clés

1. La pertinence et la qualité du contenu
2. L'autorité du domaine et les backlinks
3. L'expérience utilisateur et la vitesse de chargement
4. L'optimisation mobile et le responsive design

## La stratégie de mots-clés

Une recherche approfondie de mots-clés constitue le fondement de toute stratégie SEO efficace. Il s'agit d'identifier les termes et expressions que votre audience cible utilise pour rechercher des informations liées à votre activité.

L'analyse de l'intention de recherche est particulièrement importante. Les utilisateurs peuvent avoir des intentions informationnelles, navigationnelles, commerciales ou transactionnelles, et votre contenu doit répondre précisément à ces différentes intentions.

## Mesurer et optimiser

La mise en place d'indicateurs de performance (KPIs) pertinents est essentielle pour évaluer l'efficacité de votre stratégie SEO. Le suivi régulier de métriques comme le trafic organique, le taux de rebond et le temps passé sur le site vous permettra d'ajuster continuellement votre approche.`
  },
  {
    chapterNumber: 3,
    title: "Publicité Digitale et Réseaux Sociaux",
    content: `## L'écosystème publicitaire digital

La publicité digitale offre des possibilités de ciblage sans précédent, permettant aux entreprises d'atteindre leur audience idéale avec une précision remarquable. Des plateformes comme Google Ads, Facebook Ads et LinkedIn Ads proposent des outils sophistiqués pour créer, gérer et optimiser des campagnes publicitaires.

## Les formats publicitaires essentiels

La diversité des formats publicitaires disponibles permet d'adapter votre message à chaque contexte et objectif. Les annonces de recherche apparaissent directement dans les résultats de Google, tandis que les annonces display permettent de toucher votre audience sur des millions de sites partenaires.

### Publicité sur les réseaux sociaux

Les réseaux sociaux représentent un canal publicitaire particulièrement puissant grâce à la richesse des données démographiques et comportementales disponibles. Facebook et Instagram permettent de cibler les utilisateurs selon leur âge, leurs centres d'intérêt, leur comportement d'achat et même leur situation géographique précise.

## Optimisation des campagnes

L'optimisation continue est la clé du succès en publicité digitale. Le **test A/B** permet de comparer différentes versions de vos annonces pour identifier celles qui génèrent les meilleurs résultats. En testant systématiquement les visuels, les textes et les appels à l'action, vous pouvez améliorer progressivement les performances de vos campagnes.

Le suivi des conversions est également fondamental. En configurant correctement le pixel Facebook ou les balises de conversion Google, vous pouvez mesurer précisément le retour sur investissement de chaque campagne et prendre des décisions éclairées pour allouer votre budget publicitaire.

## Vers une stratégie intégrée

La véritable puissance du marketing digital réside dans la synergie entre les différents canaux. Une approche omnicanale cohérente, combinant SEO, contenu, publicité payante et réseaux sociaux, vous permettra de maximiser votre impact et d'atteindre vos objectifs de croissance.`
  }
];

// Générer le PDF
const doc = new PDFDocument({
  size: "A4",
  margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
  autoFirstPage: false,
  bufferPages: false,
  info: { Title: "Test Marketing Digital", Subject: "Marketing", Creator: "EbookAI Studio" },
});

const chunks = [];
doc.on("data", (c) => chunks.push(c));
doc.on("end", async () => {
  const buf = Buffer.concat(chunks);
  fs.writeFileSync("/home/ubuntu/test-service.pdf", buf);
  console.log("PDF écrit : /home/ubuntu/test-service.pdf");
  
  // Compter les pages
  const { execSync } = await import("child_process");
  try {
    const info = execSync("pdfinfo /home/ubuntu/test-service.pdf 2>&1").toString();
    const match = info.match(/Pages:\s+(\d+)/);
    console.log(`Pages selon pdfinfo: ${match ? match[1] : "inconnu"}`);
    console.log(info);
  } catch(e) {
    console.log("pdfinfo error:", e.message);
  }
});

// Cover
doc.addPage({ size: "A4", margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
doc.rect(0, 0, PAGE_W, PAGE_H).fillColor(C.coverBg).fillOpacity(1).fill();
doc.rect(0, 0, PAGE_W, 8).fillColor(C.accent).fillOpacity(1).fill();
doc.fillColor(C.white).fillOpacity(1).font("Helvetica-Bold").fontSize(30);
doc.text("Marketing Digital", MARGIN, 220, { align: "center", width: CONTENT_W });

// TOC
doc.addPage({ size: "A4", margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
doc.rect(0, 0, PAGE_W, PAGE_H).fillColor(C.pageBg).fillOpacity(1).fill();
doc.rect(0, 0, PAGE_W, 6).fillColor(C.accent).fillOpacity(1).fill();
doc.fillColor(C.white).fillOpacity(1).font("Helvetica-Bold").fontSize(20);
doc.text("Table des matières", MARGIN, 50, { width: CONTENT_W });
let tocY = 98;
for (const ch of chapters) {
  doc.font("Helvetica").fontSize(11);
  const rowH = Math.max(doc.heightOfString(ch.title, { width: CONTENT_W - 28 }), 14);
  doc.fillColor(C.accent).fillOpacity(1).font("Helvetica-Bold").fontSize(10);
  doc.text(`${ch.chapterNumber}.`, MARGIN, tocY, { width: 24 });
  doc.fillColor(C.textPrimary).fillOpacity(1).font("Helvetica").fontSize(11);
  doc.text(ch.title, MARGIN + 28, tocY, { width: CONTENT_W - 28 });
  tocY += rowH + 10;
}

// Chapters
for (const ch of chapters) {
  const startY = addContentPage(doc, false, "");
  
  doc.fillColor(C.accent).fillOpacity(1).font("Helvetica-Bold").fontSize(10);
  doc.text(`CHAPITRE ${ch.chapterNumber}`, MARGIN, startY - 4, { width: CONTENT_W });
  
  doc.font("Helvetica-Bold").fontSize(20);
  const chTitleH = doc.heightOfString(ch.title, { width: CONTENT_W });
  doc.fillColor(C.white).fillOpacity(1).text(ch.title, MARGIN, startY + 12, { width: CONTENT_W });
  
  const sepY = startY + 12 + chTitleH + 10;
  doc.moveTo(MARGIN, sepY).lineTo(PAGE_W - MARGIN, sepY).strokeColor(C.accent).strokeOpacity(1).lineWidth(0.5).stroke();
  
  let y = sepY + 18;
  const blocks = parseMarkdownBlocks(ch.content);
  
  console.log(`\nChapitre ${ch.chapterNumber}: ${blocks.length} blocs`);
  for (const block of blocks) {
    console.log(`  [${block.type}] "${block.text.slice(0, 50)}..."`);
    y = renderBlock(doc, block, y, false, "");
  }
  
  doc.fillColor(C.textDim).fillOpacity(1).font("Helvetica").fontSize(9);
  doc.text(`${ch.chapterNumber}`, MARGIN, PAGE_H - 50, { align: "center", width: CONTENT_W });
}

doc.end();
