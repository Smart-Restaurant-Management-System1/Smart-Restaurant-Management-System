-- SR-58 upgrade for the SR-57 Reservations table. Safe to rerun on MySQL 8.
USE restaurant_reservation_db;

DROP PROCEDURE IF EXISTS ApplyReservationCreationUpgrade;
DELIMITER //
CREATE PROCEDURE ApplyReservationCreationUpgrade()
BEGIN
    -- SR-57 did not create customer ownership fields. Existing rows cannot be safely attributed, so fail closed.
    IF EXISTS (SELECT 1 FROM Reservations)
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND column_name = 'CustomerId') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SR-58 migration requires an empty pre-SR-58 Reservations table';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND column_name = 'CustomerId') THEN ALTER TABLE Reservations ADD COLUMN CustomerId INT NOT NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND column_name = 'BookingReference') THEN ALTER TABLE Reservations ADD COLUMN BookingReference VARCHAR(16) NOT NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND column_name = 'GuestCount') THEN ALTER TABLE Reservations ADD COLUMN GuestCount INT NOT NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND column_name = 'IdempotencyKey') THEN ALTER TABLE Reservations ADD COLUMN IdempotencyKey VARCHAR(64) NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND constraint_name = 'chk_reservations_guests') THEN ALTER TABLE Reservations ADD CONSTRAINT chk_reservations_guests CHECK (GuestCount > 0); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND constraint_name = 'chk_reservations_status') THEN ALTER TABLE Reservations ADD CONSTRAINT chk_reservations_status CHECK (Status IN ('Pending', 'Confirmed', 'Cancelled')); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND index_name = 'uq_reservations_booking_reference') THEN CREATE UNIQUE INDEX uq_reservations_booking_reference ON Reservations (BookingReference); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND index_name = 'uq_reservations_customer_idempotency') THEN CREATE UNIQUE INDEX uq_reservations_customer_idempotency ON Reservations (CustomerId, IdempotencyKey); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND index_name = 'idx_reservations_customer_created') THEN CREATE INDEX idx_reservations_customer_created ON Reservations (CustomerId, CreatedAt); END IF;
END //
DELIMITER ;
CALL ApplyReservationCreationUpgrade();
DROP PROCEDURE ApplyReservationCreationUpgrade;

-- Rollback: do not drop this migration from shared databases. Restore from a backup only after confirming no SR-58 reservation data exists.
