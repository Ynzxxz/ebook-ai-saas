CREATE TABLE `transactions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `paypalTransactionId` varchar(256) UNIQUE,
  `paypalOrderId` varchar(256),
  `packType` enum('starter', 'pro', 'unlimited') NOT NULL,
  `amount` varchar(10) NOT NULL,
  `creditsAdded` int NOT NULL,
  `status` enum('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `expiresAt` timestamp NULL,
  `isRenewed` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
