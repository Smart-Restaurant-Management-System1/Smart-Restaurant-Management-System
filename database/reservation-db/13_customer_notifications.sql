-- SR-220 / SR-238: Customer Notifications
-- Idempotent schema migration for in-application customer reservation and order lifecycle notifications.
USE restaurant_reservation_db;

CREATE TABLE IF NOT EXISTS `CustomerNotifications` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `CustomerId` INT NOT NULL,
    `EventType` VARCHAR(50) NOT NULL COMMENT 'ReservationCreated | ReservationUpdated | ReservationCancelled | OrderCreated | OrderPreparing | OrderReady | OrderServed | OrderCancelled | PaymentSucceeded | PaymentFailed',
    `Title` VARCHAR(120) NOT NULL,
    `Message` VARCHAR(500) NOT NULL,
    `ReferenceType` VARCHAR(30) NULL COMMENT 'Reservation | Order | Payment',
    `ReferenceId` INT NULL,
    `ReferenceCode` VARCHAR(64) NULL COMMENT 'Booking reference or order reference (e.g. RES-XXX, DIN-000001)',
    `IsRead` TINYINT(1) NOT NULL DEFAULT 0,
    `ReadAt` DATETIME NULL,
    `IdempotencyKey` VARCHAR(100) NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `uq_cust_notif_idempotency` UNIQUE (`IdempotencyKey`),
    INDEX `idx_cust_notif_customer_created` (`CustomerId`, `CreatedAt` DESC),
    INDEX `idx_cust_notif_customer_unread` (`CustomerId`, `IsRead`),
    INDEX `idx_cust_notif_reference` (`ReferenceType`, `ReferenceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification Query:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'restaurant_reservation_db' AND table_name = 'CustomerNotifications';

-- Rollback Guidance:
-- DROP TABLE IF EXISTS `CustomerNotifications`;

