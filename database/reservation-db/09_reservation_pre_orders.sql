-- SR-134: Reservation-linked pre-orders
USE restaurant_reservation_db;

CREATE TABLE IF NOT EXISTS `ReservationPreOrders` (
    `OrderId` INT AUTO_INCREMENT PRIMARY KEY,
    `CustomerId` INT NOT NULL,
    `ReservationId` INT NOT NULL,
    `IdempotencyKey` VARCHAR(64) NOT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
    `TotalAmount` DECIMAL(10,2) NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT `fk_pre_orders_reservation`
        FOREIGN KEY (`ReservationId`)
        REFERENCES `Reservations` (`Id`)
        ON DELETE RESTRICT,

    CONSTRAINT `uq_pre_orders_customer_key`
        UNIQUE (`CustomerId`, `IdempotencyKey`),

    CONSTRAINT `chk_pre_orders_status`
        CHECK (`Status` IN ('Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled')),

    CONSTRAINT `chk_pre_orders_total`
        CHECK (`TotalAmount` >= 0),

    INDEX `idx_pre_orders_customer`
        (`CustomerId`),

    INDEX `idx_pre_orders_reservation`
        (`ReservationId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ReservationPreOrderItems` (
    `OrderItemId` INT AUTO_INCREMENT PRIMARY KEY,
    `OrderId` INT NOT NULL,
    `MenuItemId` INT NOT NULL,
    `Quantity` INT NOT NULL,
    `UnitPrice` DECIMAL(10,2) NOT NULL,

    CONSTRAINT `fk_pre_order_items_order`
        FOREIGN KEY (`OrderId`)
        REFERENCES `ReservationPreOrders` (`OrderId`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_pre_order_items_menu_item`
        FOREIGN KEY (`MenuItemId`)
        REFERENCES `MenuItems` (`MenuItemId`)
        ON DELETE RESTRICT,

    CONSTRAINT `chk_pre_order_items_quantity`
        CHECK (`Quantity` > 0),

    CONSTRAINT `chk_pre_order_items_price`
        CHECK (`UnitPrice` >= 0),

    INDEX `idx_pre_order_items_order`
        (`OrderId`)
) ENGINE=InnoDB;
