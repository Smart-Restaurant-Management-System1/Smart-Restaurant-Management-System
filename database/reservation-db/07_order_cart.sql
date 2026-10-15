-- =======================================================
-- Smart Restaurant Management System
-- Customer Order Cart
-- SR-132
-- =======================================================

USE restaurant_reservation_db;

-- 1. Customer order carts
CREATE TABLE IF NOT EXISTS `OrderCarts` (
    `CartId` INT AUTO_INCREMENT PRIMARY KEY,
    `CustomerId` INT NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT `uq_order_carts_customer`
        UNIQUE (`CustomerId`),

    INDEX `idx_order_carts_customer`
        (`CustomerId`)
) ENGINE=InnoDB;


-- 2. Items inside each order cart
CREATE TABLE IF NOT EXISTS `OrderCartItems` (
    `CartItemId` INT AUTO_INCREMENT PRIMARY KEY,
    `CartId` INT NOT NULL,
    `MenuItemId` INT NOT NULL,
    `Quantity` INT NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT `fk_order_cart_items_cart`
        FOREIGN KEY (`CartId`)
        REFERENCES `OrderCarts` (`CartId`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_order_cart_items_menu_item`
        FOREIGN KEY (`MenuItemId`)
        REFERENCES `MenuItems` (`MenuItemId`)
        ON DELETE RESTRICT,

    CONSTRAINT `uq_order_cart_items_cart_menu_item`
        UNIQUE (`CartId`, `MenuItemId`),

    CONSTRAINT `chk_order_cart_items_quantity`
        CHECK (`Quantity` > 0),

    INDEX `idx_order_cart_items_cart`
        (`CartId`),

    INDEX `idx_order_cart_items_menu_item`
        (`MenuItemId`)
) ENGINE=InnoDB;