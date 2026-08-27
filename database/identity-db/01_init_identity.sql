-- =======================================================
-- Smart Restaurant Management System
-- Identity Service Database Initialization
-- =======================================================

CREATE DATABASE IF NOT EXISTS restaurant_identity_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE restaurant_identity_db;

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS `Roles` (
    `RoleId` INT AUTO_INCREMENT PRIMARY KEY,
    `RoleName` VARCHAR(50) NOT NULL UNIQUE,
    `Description` VARCHAR(255) NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS `Users` (
    `UserId` INT AUTO_INCREMENT PRIMARY KEY,
    `FullName` VARCHAR(100) NOT NULL,
    `Email` VARCHAR(150) NOT NULL UNIQUE,
    `PhoneNumber` VARCHAR(20) NULL,
    `PasswordHash` VARCHAR(255) NOT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT TRUE,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_email` (`Email`)
) ENGINE=InnoDB;

-- 3. UserRoles Mapping Table
CREATE TABLE IF NOT EXISTS `UserRoles` (
    `UserId` INT NOT NULL,
    `RoleId` INT NOT NULL,
    `AssignedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`UserId`, `RoleId`),

    CONSTRAINT `fk_userroles_user`
        FOREIGN KEY (`UserId`)
        REFERENCES `Users` (`UserId`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_userroles_role`
        FOREIGN KEY (`RoleId`)
        REFERENCES `Roles` (`RoleId`)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Seed Standard Roles
INSERT INTO `Roles` (`RoleId`, `RoleName`, `Description`)
VALUES
    (1, 'Customer',
     'Restaurant customer who can view menu and make reservations/orders'),
    (2, 'Admin',
     'Restaurant manager with full administrative privileges'),
    (3, 'KitchenStaff',
     'Kitchen team member who views and updates food prep queue')
ON DUPLICATE KEY UPDATE
    `Description` = VALUES(`Description`);
