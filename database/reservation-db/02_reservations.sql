-- SR-57 availability persistence. This script is idempotent and runs for a new Compose database volume.
USE restaurant_reservation_db;

CREATE TABLE IF NOT EXISTS `Reservations` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `TableId` INT NOT NULL,
    `StartDateTime` DATETIME NOT NULL,
    `EndDateTime` DATETIME NOT NULL,
    `Status` VARCHAR(20) NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_reservations_table` FOREIGN KEY (`TableId`) REFERENCES `RestaurantTables` (`Id`),
    CONSTRAINT `chk_reservations_period` CHECK (`EndDateTime` > `StartDateTime`),
    INDEX `idx_reservations_table_status_period` (`TableId`, `Status`, `StartDateTime`, `EndDateTime`)
) ENGINE=InnoDB;

-- Supports filtering active candidate tables by party size before the correlated reservation check.
CREATE INDEX `idx_tables_active_capacity` ON `RestaurantTables` (`IsActive`, `Capacity`);
