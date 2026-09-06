-- =======================================================
-- Smart Restaurant Management System
-- Reservation Service Database Initialization
-- =======================================================

CREATE DATABASE IF NOT EXISTS restaurant_reservation_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE restaurant_reservation_db;

-- 1. RestaurantTables Table
CREATE TABLE IF NOT EXISTS `RestaurantTables` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `TableNumber` VARCHAR(20) NOT NULL,
    `Capacity` INT NOT NULL,
    `Location` VARCHAR(100) NOT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Available',
    `IsActive` BOOLEAN NOT NULL DEFAULT TRUE,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL 
        DEFAULT CURRENT_TIMESTAMP 
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT `uq_restaurant_tables_tablenumber` UNIQUE (`TableNumber`),
    CONSTRAINT `chk_restaurant_tables_capacity` CHECK (`Capacity` > 0),
    INDEX `idx_tables_tablenumber` (`TableNumber`),
    INDEX `idx_tables_isactive` (`IsActive`)
) ENGINE=InnoDB;

-- 2. Seed Standard Tables
INSERT INTO `RestaurantTables` (`TableNumber`, `Capacity`, `Location`, `IsActive`)
VALUES
    ('T-01', 2, 'Window', TRUE),
    ('T-02', 4, 'Main Dining', TRUE),
    ('T-03', 6, 'Private Booth', TRUE),
    ('T-04', 8, 'Patio', TRUE),
    ('T-05', 2, 'Bar Area', TRUE)
ON DUPLICATE KEY UPDATE
    `Capacity` = VALUES(`Capacity`),
    `Location` = VALUES(`Location`),
    `IsActive` = VALUES(`IsActive`);
