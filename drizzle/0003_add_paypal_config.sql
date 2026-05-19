CREATE TABLE `paypalConfig` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL UNIQUE,
  `clientId` text NOT NULL,
  `clientSecret` text NOT NULL,
  `mode` enum('sandbox','live') NOT NULL DEFAULT 'sandbox',
  `webhookId` varchar(256),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
