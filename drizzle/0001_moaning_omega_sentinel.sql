CREATE TABLE `chapters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ebookId` int NOT NULL,
	`chapterNumber` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ebooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`subject` text NOT NULL,
	`chapterCount` int NOT NULL DEFAULT 5,
	`language` varchar(64) NOT NULL DEFAULT 'Français',
	`tone` enum('professional','casual','academic','creative','motivational') NOT NULL DEFAULT 'professional',
	`status` enum('pending','generating','completed','error') NOT NULL DEFAULT 'pending',
	`pdfKey` varchar(512),
	`pdfUrl` varchar(1024),
	`hasWatermark` boolean NOT NULL DEFAULT false,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ebooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `plan` enum('free','starter','pro') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `creditsUsed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `creditsReset` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `stripePriceId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCurrentPeriodEnd` timestamp;