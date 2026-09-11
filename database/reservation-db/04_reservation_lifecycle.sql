-- SR-60: expand the controlled reservation lifecycle and add the history-query index. Safe to rerun on MySQL 8.
USE restaurant_reservation_db;

DROP PROCEDURE IF EXISTS ApplyReservationLifecycleUpgrade;
DELIMITER //
CREATE PROCEDURE ApplyReservationLifecycleUpgrade()
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND constraint_name = 'chk_reservations_status') THEN
        ALTER TABLE Reservations DROP CHECK chk_reservations_status;
    END IF;
    ALTER TABLE Reservations ADD CONSTRAINT chk_reservations_status CHECK (Status IN ('Pending', 'Confirmed', 'Cancelled', 'Completed'));
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND index_name = 'idx_reservations_customer_visit') THEN
        CREATE INDEX idx_reservations_customer_visit ON Reservations (CustomerId, StartDateTime, Id);
    END IF;
END //
DELIMITER ;
CALL ApplyReservationLifecycleUpgrade();
DROP PROCEDURE ApplyReservationLifecycleUpgrade;

-- Rollback: restore the previous check only after confirming no Completed records exist.
