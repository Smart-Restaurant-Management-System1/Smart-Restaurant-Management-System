-- SR-130: Menu Items Management
-- Creates the menu items table without deleting historical records.

USE restaurant_reservation_db;

CREATE TABLE IF NOT EXISTS `MenuItems` (
    `MenuItemId` INT AUTO_INCREMENT PRIMARY KEY,
    `ItemName` VARCHAR(150) NOT NULL,
    `Description` VARCHAR(1000) NULL,
    `Price` DECIMAL(10,2) NOT NULL,
    `Category` VARCHAR(50) NOT NULL,
    `DietaryInfo` VARCHAR(50) NOT NULL,
    `ImageReference` VARCHAR(500) NULL,
    `IsAvailable` BOOLEAN NOT NULL DEFAULT TRUE,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT `chk_menu_items_price`
        CHECK (`Price` > 0),

    CONSTRAINT `chk_menu_items_category`
        CHECK (`Category` IN (
            'Appetizer',
            'Main Course',
            'Dessert',
            'Beverage',
            'Side Dish'
        )),

    CONSTRAINT `chk_menu_items_dietary`
        CHECK (`DietaryInfo` IN (
            'None',
            'Vegetarian',
            'Vegan',
            'Halal',
            'Gluten-Free'
        )),

    INDEX `idx_menu_items_category` (`Category`),
    INDEX `idx_menu_items_availability` (`IsAvailable`),
    INDEX `idx_menu_items_name` (`ItemName`)
) ENGINE=InnoDB;
