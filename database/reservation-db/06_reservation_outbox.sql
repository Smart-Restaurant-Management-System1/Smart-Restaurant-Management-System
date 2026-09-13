-- SR-115: Transactional outbox table for reservation lifecycle events.
-- Provides at-least-once delivery of reservation events to Kafka.
-- Safe to rerun on MySQL 8 (InnoDB). All timestamps are UTC.
USE restaurant_reservation_db;

DROP PROCEDURE IF EXISTS ApplyReservationOutbox;
DELIMITER //
CREATE PROCEDURE ApplyReservationOutbox()
BEGIN
    -- Create the outbox table if it does not exist.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'ReservationOutbox'
    ) THEN
        CREATE TABLE ReservationOutbox (
            Id             BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
            EventId        CHAR(36)         NOT NULL COMMENT 'Stable UUID for this event; reused on retry for consumer idempotency',
            EventType      VARCHAR(64)      NOT NULL COMMENT 'Stable event type name, e.g. ReservationCreated',
            SchemaVersion  TINYINT UNSIGNED NOT NULL DEFAULT 1,
            AggregateType  VARCHAR(32)      NOT NULL DEFAULT 'Reservation',
            AggregateId    INT              NOT NULL COMMENT 'Reservation.Id — used as Kafka message key',
            MessageKey     VARCHAR(32)      NOT NULL COMMENT 'String form of AggregateId for Kafka keying',
            Payload        MEDIUMTEXT       NOT NULL COMMENT 'Full JSON envelope; no credentials allowed',
            OccurredAtUtc  DATETIME(3)      NOT NULL COMMENT 'Business-event UTC time',
            CreatedAtUtc   DATETIME(3)      NOT NULL COMMENT 'Row-insert UTC time',
            ProcessedAtUtc DATETIME(3)      NULL     COMMENT 'Set only after broker acknowledgement',
            AttemptCount   SMALLINT         NOT NULL DEFAULT 0,
            NextAttemptAtUtc DATETIME(3)    NULL     COMMENT 'Eligible for retry at or after this time',
            LastError      VARCHAR(512)     NULL     COMMENT 'Bounded safe diagnostic; no secrets',
            Status         VARCHAR(16)      NOT NULL DEFAULT 'Pending'
                               COMMENT 'Pending|Processing|Processed|DeadLetter',
            LockId         CHAR(36)         NULL     COMMENT 'Publisher instance UUID holding the processing lease',
            LockedUntilUtc DATETIME(3)      NULL     COMMENT 'Lease expiry; expired leases are recoverable',
            PRIMARY KEY (Id),
            UNIQUE KEY uq_outbox_event_id (EventId),
            -- Pending-retrieval index: filters eligible rows and orders deterministically.
            -- EXPLAIN: uses Status+NextAttemptAtUtc for range scan; OccurredAtUtc+Id break ties.
            INDEX idx_outbox_pending (Status, NextAttemptAtUtc, OccurredAtUtc, Id),
            -- Processed-record retention and cleanup index.
            INDEX idx_outbox_processed_at (ProcessedAtUtc),
            CONSTRAINT chk_outbox_status CHECK (Status IN ('Pending','Processing','Processed','DeadLetter')),
            CONSTRAINT chk_outbox_attempts CHECK (AttemptCount >= 0)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    END IF;

    -- Add LockId column if missing (safe on re-run after partial migration).
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'ReservationOutbox' AND column_name = 'LockId'
    ) THEN
        ALTER TABLE ReservationOutbox
            ADD COLUMN LockId CHAR(36) NULL COMMENT 'Publisher instance UUID holding the processing lease',
            ADD COLUMN LockedUntilUtc DATETIME(3) NULL COMMENT 'Lease expiry; expired leases are recoverable';
    END IF;
END /
DELIMITER ;
CALL ApplyReservationOutbox();
DROP PROCEDURE ApplyReservationOutbox;

-- Rollback: DROP TABLE ReservationOutbox; — safe only after confirming all Pending/Processing rows are empty.
-- Processed rows can be archived before dropping.
