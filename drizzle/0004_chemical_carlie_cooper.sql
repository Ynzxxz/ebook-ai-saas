ALTER TABLE `ebooks` ADD `isFavorite` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `shareToken` varchar(64);--> statement-breakpoint
ALTER TABLE `ebooks` ADD `isPublic` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD CONSTRAINT `ebooks_shareToken_unique` UNIQUE(`shareToken`);