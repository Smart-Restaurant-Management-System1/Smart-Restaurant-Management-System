USE restaurant_reservation_db;

SET @schema_name = DATABASE();

-- Create aggregate index only if it does not already exist
SET @sql = (
    SELECT IF(
        EXISTS (
            SELECT 1
            FROM information_schema.statistics
            WHERE table_schema = @schema_name
              AND table_name = 'reservationoutbox'
              AND index_name = 'idx_outbox_aggregate'
        ),
        'SELECT 1',
        'CREATE INDEX idx_outbox_aggregate ON ReservationOutbox (AggregateType, AggregateId)'
    )
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create event type index only if it does not already exist
SET @sql = (
    SELECT IF(
        EXISTS (
            SELECT 1
            FROM information_schema.statistics
            WHERE table_schema = @schema_name
              AND table_name = 'reservationoutbox'
              AND index_name = 'idx_outbox_event_type'
        ),
        'SELECT 1',
        'CREATE INDEX idx_outbox_event_type ON ReservationOutbox (EventType)'
    )
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
