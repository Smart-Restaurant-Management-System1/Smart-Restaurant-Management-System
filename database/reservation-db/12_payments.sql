-- SR-280 / SR-282: Payments and Payment Notification Events
-- Idempotent schema migration for payments, PayHere webhook idempotency, and multi-method settlements (Cash, Bank Transfer).
USE restaurant_reservation_db;

CREATE TABLE IF NOT EXISTS `Payments` (
    `PaymentId` INT AUTO_INCREMENT PRIMARY KEY,
    `CustomerId` INT NOT NULL,
    `OrderType` VARCHAR(30) NOT NULL COMMENT 'DineIn | ReservationPreOrder',
    `OrderId` INT NOT NULL,
    `PaymentMethod` VARCHAR(20) NOT NULL DEFAULT 'PayHere' COMMENT 'PayHere | Cash | BankTransfer',
    `Amount` DECIMAL(10,2) NOT NULL,
    `Currency` VARCHAR(5) NOT NULL DEFAULT 'LKR',
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Pending' COMMENT 'Pending | Succeeded | Failed | Cancelled',
    `MerchantOrderReference` VARCHAR(64) NOT NULL,
    `ProviderPaymentId` VARCHAR(64) NULL COMMENT 'PayHere payment_id or bank deposit reference',
    `SlipUrl` VARCHAR(500) NULL COMMENT 'Bank deposit slip image path/URL',
    `CustomerNotes` VARCHAR(500) NULL,
    `VerifiedBy` INT NULL COMMENT 'Admin/Staff userId who verified cash or slip',
    `VerifiedAt` DATETIME NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_payments_status` CHECK (`Status` IN ('Pending', 'Succeeded', 'Failed', 'Cancelled')),
    CONSTRAINT `chk_payments_method` CHECK (`PaymentMethod` IN ('PayHere', 'Cash', 'BankTransfer')),
    CONSTRAINT `chk_payments_amount` CHECK (`Amount` >= 0),
    CONSTRAINT `uq_payments_merchant_ref` UNIQUE (`MerchantOrderReference`),
    INDEX `idx_payments_customer` (`CustomerId`, `CreatedAt`),
    INDEX `idx_payments_order` (`OrderType`, `OrderId`, `Status`),
    INDEX `idx_payments_provider_ref` (`ProviderPaymentId`),
    INDEX `idx_payments_status` (`Status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PaymentNotificationEvents` (
    `NotificationId` INT AUTO_INCREMENT PRIMARY KEY,
    `Provider` VARCHAR(20) NOT NULL DEFAULT 'PayHere',
    `ProviderPaymentId` VARCHAR(64) NOT NULL,
    `MerchantOrderReference` VARCHAR(64) NOT NULL,
    `StatusCode` VARCHAR(10) NOT NULL,
    `PayHereAmount` DECIMAL(10,2) NOT NULL,
    `PayHereCurrency` VARCHAR(5) NOT NULL,
    `SignatureHash` VARCHAR(64) NOT NULL,
    `ProcessedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `IsSuccess` TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT `uq_provider_notification` UNIQUE (`Provider`, `ProviderPaymentId`),
    INDEX `idx_notification_order_ref` (`MerchantOrderReference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification Query:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'restaurant_reservation_db' AND table_name IN ('Payments', 'PaymentNotificationEvents');

-- Rollback Guidance:
-- DROP TABLE IF EXISTS `PaymentNotificationEvents`;
-- DROP TABLE IF EXISTS `Payments`;
