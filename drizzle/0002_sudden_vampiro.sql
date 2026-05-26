CREATE TABLE `paypalConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` text NOT NULL,
	`clientSecret` text NOT NULL,
	`mode` enum('sandbox','live') NOT NULL DEFAULT 'sandbox',
	`webhookId` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paypalConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `paypalConfig_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`paypalTransactionId` varchar(256),
	`paypalOrderId` varchar(256),
	`packType` enum('starter','pro','unlimited') NOT NULL,
	`amount` varchar(10) NOT NULL,
	`creditsAdded` int NOT NULL,
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp,
	`isRenewed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_paypalTransactionId_unique` UNIQUE(`paypalTransactionId`)
);
--> statement-breakpoint
ALTER TABLE `ebooks` ADD `primaryColor` varchar(7) DEFAULT '#7c3aed' NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `fontFamily` varchar(64) DEFAULT 'inter' NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `coverImageUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `ebooks` ADD `autoStyle` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `creditsBalance` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `plan`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `creditsUsed`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `creditsReset`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripeCustomerId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripeSubscriptionId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripePriceId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `stripeCurrentPeriodEnd`;