-- SR-219 / SR-234 / SR-236: Customer Feedback and Restaurant Rating Management
USE restaurant_reservation_db;

CREATE TABLE IF NOT EXISTS `CustomerFeedbacks` (
    `FeedbackId` INT AUTO_INCREMENT PRIMARY KEY,
    `CustomerId` INT NOT NULL,
    `ReservationId` INT NULL,
    `OrderId` INT NULL,
    `OrderType` VARCHAR(30) NULL,
    `Rating` INT NOT NULL,
    `Comment` VARCHAR(1000) NULL,
    `IsRead` TINYINT(1) NOT NULL DEFAULT 0,
    `AdminReply` VARCHAR(1000) NULL,
    `AdminRepliedAt` DATETIME NULL,
    `AdminRepliedBy` INT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_customer_feedback_rating` CHECK (`Rating` >= 1 AND `Rating` <= 5),
    CONSTRAINT `fk_customer_feedback_reservation` FOREIGN KEY (`ReservationId`) REFERENCES `Reservations` (`Id`) ON DELETE SET NULL,
    CONSTRAINT `uq_feedback_customer_reservation` UNIQUE (`CustomerId`, `ReservationId`),
    CONSTRAINT `uq_feedback_customer_order` UNIQUE (`CustomerId`, `OrderId`, `OrderType`),
    INDEX `idx_feedback_customer` (`CustomerId`, `CreatedAt`),
    INDEX `idx_feedback_rating_created` (`Rating`, `CreatedAt`),
    INDEX `idx_feedback_is_read` (`IsRead`, `CreatedAt`)
) ENGINE=InnoDB;

-- Backward-compatibility idempotent alteration for existing database containers
SET @exist_is_read := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'restaurant_reservation_db'
      AND TABLE_NAME = 'CustomerFeedbacks'
      AND COLUMN_NAME = 'IsRead'
);

SET @sql_stmt := IF(@exist_is_read = 0,
    'ALTER TABLE `CustomerFeedbacks`
        ADD COLUMN `IsRead` TINYINT(1) NOT NULL DEFAULT 0 AFTER `Comment`,
        ADD COLUMN `AdminReply` VARCHAR(1000) NULL AFTER `IsRead`,
        ADD COLUMN `AdminRepliedAt` DATETIME NULL AFTER `AdminReply`,
        ADD COLUMN `AdminRepliedBy` INT NULL AFTER `AdminRepliedAt`,
        ADD INDEX `idx_feedback_is_read` (`IsRead`, `CreatedAt`);',
    'SELECT 1;'
);

PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

