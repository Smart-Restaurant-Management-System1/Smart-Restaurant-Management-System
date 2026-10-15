-- SR-133: persistent dine-in orders. Prices are copied to order items at submission time.
USE restaurant_reservation_db;

CREATE TABLE IF NOT EXISTS `DineInOrders` (
    `OrderId` INT AUTO_INCREMENT PRIMARY KEY,
    `CustomerId` INT NOT NULL,
    `TableId` INT NOT NULL,
    `IdempotencyKey` VARCHAR(64) NOT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Received',
    `TotalAmount` DECIMAL(10,2) NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_dine_in_orders_table` FOREIGN KEY (`TableId`) REFERENCES `RestaurantTables` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `uq_dine_in_orders_customer_key` UNIQUE (`CustomerId`, `IdempotencyKey`),
    CONSTRAINT `chk_dine_in_orders_status` CHECK (`Status` IN ('Received', 'Preparing', 'Ready', 'Served', 'Cancelled')),
    CONSTRAINT `chk_dine_in_orders_total` CHECK (`TotalAmount` >= 0),
    INDEX `idx_dine_in_orders_table_status` (`TableId`, `Status`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `DineInOrderItems` (
    `OrderItemId` INT AUTO_INCREMENT PRIMARY KEY,
    `OrderId` INT NOT NULL,
    `MenuItemId` INT NOT NULL,
    `Quantity` INT NOT NULL,
    `UnitPrice` DECIMAL(10,2) NOT NULL,
    CONSTRAINT `fk_dine_in_order_items_order` FOREIGN KEY (`OrderId`) REFERENCES `DineInOrders` (`OrderId`) ON DELETE CASCADE,
    CONSTRAINT `fk_dine_in_order_items_menu_item` FOREIGN KEY (`MenuItemId`) REFERENCES `MenuItems` (`MenuItemId`) ON DELETE RESTRICT,
    CONSTRAINT `chk_dine_in_order_items_quantity` CHECK (`Quantity` > 0),
    CONSTRAINT `chk_dine_in_order_items_unit_price` CHECK (`UnitPrice` >= 0),
    INDEX `idx_dine_in_order_items_order` (`OrderId`)
) ENGINE=InnoDB;
