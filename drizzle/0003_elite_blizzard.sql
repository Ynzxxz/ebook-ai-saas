ALTER TABLE `ebooks` ADD `coverStyle` varchar(64) DEFAULT 'modern' NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `coverBackgroundColor` varchar(7) DEFAULT '#1a1a2e' NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `pageBackgroundStyle` varchar(64) DEFAULT 'solid' NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `pageBackgroundColor` varchar(7) DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `pageAccentColor` varchar(7) DEFAULT '#7c3aed' NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `pageLayout` varchar(64) DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `marginSize` varchar(64) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `lineHeight` varchar(64) DEFAULT '1.5' NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `watermarkText` varchar(256);--> statement-breakpoint
ALTER TABLE `ebooks` ADD `watermarkOpacity` int DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `pageNumberingStyle` varchar(64) DEFAULT 'arabic' NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `pageNumberingPosition` varchar(64) DEFAULT 'bottom-center' NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `headerText` varchar(256);--> statement-breakpoint
ALTER TABLE `ebooks` ADD `footerText` varchar(256);--> statement-breakpoint
ALTER TABLE `ebooks` ADD `showChapterTitlesInHeader` boolean DEFAULT false NOT NULL;