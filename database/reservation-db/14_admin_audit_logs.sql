-- =======================================================
-- Smart Restaurant Management System
-- Reservation Service: Admin Audit Logs (SR-223 / SR-250)
-- Append-only audit trail for administrative operations
-- =======================================================

USE restaurant_reservation_db;

CREATE TABLE IF NOT EXISTS `AdminAuditLogs` (
    `AuditLogId` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `TimestampUtc` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ActionType` VARCHAR(60) NOT NULL COMMENT 'USER_BLOCKED, USER_UNBLOCKED, USER_DELETED, MENU_ITEM_CREATED, etc.',
    `AdminId` INT NOT NULL COMMENT 'ID of authenticated administrator from JWT',
    `AdminEmail` VARCHAR(150) NOT NULL COMMENT 'Email of authenticated administrator from JWT',
    `AdminRole` VARCHAR(50) NOT NULL DEFAULT 'Admin',
    `TargetType` VARCHAR(50) NOT NULL COMMENT 'User, MenuItem, Reservation, Table, etc.',
    `TargetId` VARCHAR(100) NULL COMMENT 'Target entity identifier',
    `Result` VARCHAR(30) NOT NULL DEFAULT 'Success' COMMENT 'Success, Denied, Failed',
    `DetailsJson` TEXT NULL COMMENT 'Sanitized non-sensitive audit metadata (no passwords/tokens)',
    `SourceService` VARCHAR(50) NOT NULL DEFAULT 'ReservationService' COMMENT 'Service originating the audit entry',
    `IpAddress` VARCHAR(60) NULL COMMENT 'Client IP address where available',
    INDEX `idx_audit_timestamp` (`TimestampUtc` DESC),
    INDEX `idx_audit_action_type` (`ActionType`, `TimestampUtc` DESC),
    INDEX `idx_audit_admin_id` (`AdminId`, `TimestampUtc` DESC),
    INDEX `idx_audit_target` (`TargetType`, `TargetId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification Query:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'restaurant_reservation_db' AND table_name = 'AdminAuditLogs';

