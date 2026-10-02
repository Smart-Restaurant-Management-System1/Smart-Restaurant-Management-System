-- SR-219 / SR-234: Customer Feedback and Restaurant Rating Management
USE restaurant_reservation_db;

CREATE TABLE IF NOT EXISTS `CustomerFeedbacks` (
    `FeedbackId` INT AUTO_INCREMENT PRIMARY KEY,
    `CustomerId` INT NOT NULL,
    `ReservationId` INT NULL,
    `OrderId` INT NULL,
    `OrderType` VARCHAR(30) NULL,
    `Rating` INT NOT NULL,
    `Comment` VARCHAR(1000) NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_customer_feedback_rating` CHECK (`Rating` >= 1 AND `Rating` <= 5),
    CONSTRAINT `fk_customer_feedback_reservation` FOREIGN KEY (`ReservationId`) REFERENCES `Reservations` (`Id`) ON DELETE SET NULL,
    CONSTRAINT `uq_feedback_customer_reservation` UNIQUE (`CustomerId`, `ReservationId`),
    CONSTRAINT `uq_feedback_customer_order` UNIQUE (`CustomerId`, `OrderId`, `OrderType`),
    INDEX `idx_feedback_customer` (`CustomerId`, `CreatedAt`),
    INDEX `idx_feedback_rating_created` (`Rating`, `CreatedAt`)
) ENGINE=InnoDB;
