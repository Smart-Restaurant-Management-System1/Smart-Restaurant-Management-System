-- SR-81/SR-62: repeatable support for the final transactional overlap lookup.
-- The index improves candidate lookup; interval overlap correctness comes from the table-row FOR UPDATE lock.
USE restaurant_reservation_db;

DROP PROCEDURE IF EXISTS ApplyReservationConcurrencyIndex;
DELIMITER //
CREATE PROCEDURE ApplyReservationConcurrencyIndex()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Reservations' AND index_name = 'idx_reservations_table_status_period') THEN
        CREATE INDEX idx_reservations_table_status_period ON Reservations (TableId, Status, StartDateTime, EndDateTime);
    END IF;
END //
DELIMITER ;
CALL ApplyReservationConcurrencyIndex();
DROP PROCEDURE ApplyReservationConcurrencyIndex;
