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

-- Initial Seed Audit History (SR-223 / SR-253)
INSERT INTO `AdminAuditLogs` (`TimestampUtc`, `ActionType`, `AdminId`, `AdminEmail`, `AdminRole`, `TargetType`, `TargetId`, `Result`, `DetailsJson`, `SourceService`, `IpAddress`)
VALUES
(UTC_TIMESTAMP() - INTERVAL 1 HOUR, 'MENU_AVAILABILITY_CHANGED', 8, 'admin@cinnamonbistro.com', 'Admin', 'MenuItem', '3', 'Success', '{"menuItemId":3,"name":"Signature Cinnamon Duck","isAvailable":true,"updatedBy":"admin@cinnamonbistro.com"}', 'reservation-service', '127.0.0.1'),
(UTC_TIMESTAMP() - INTERVAL 4 HOUR, 'USER_BLOCKED', 8, 'admin@cinnamonbistro.com', 'Admin', 'User', '14', 'Success', '{"targetUserId":14,"email":"abusive_user@example.com","role":"Customer","newStatus":"Blocked","reason":"Spam activity detected"}', 'identity-service', '127.0.0.1'),
(UTC_TIMESTAMP() - INTERVAL 1 DAY, 'MENU_ITEM_UPDATED', 8, 'admin@cinnamonbistro.com', 'Admin', 'MenuItem', '5', 'Success', '{"menuItemId":5,"name":"Ceylon Spiced Seafood Curry","price":2850.00,"category":"Mains"}', 'reservation-service', '127.0.0.1'),
(UTC_TIMESTAMP() - INTERVAL 2 DAY, 'RESERVATION_STATUS_CHANGED', 8, 'admin@cinnamonbistro.com', 'Admin', 'Reservation', '42', 'Success', '{"reservationId":42,"customerName":"Kamal Perera","previousStatus":"Pending","newStatus":"Confirmed"}', 'reservation-service', '127.0.0.1'),
(UTC_TIMESTAMP() - INTERVAL 3 DAY, 'TABLE_CREATED', 8, 'admin@cinnamonbistro.com', 'Admin', 'Table', '12', 'Success', '{"tableNumber":"T12","capacity":6,"location":"Verandah"}', 'reservation-service', '127.0.0.1'),
(UTC_TIMESTAMP() - INTERVAL 4 DAY, 'USER_UNBLOCKED', 8, 'admin@cinnamonbistro.com', 'Admin', 'User', '19', 'Success', '{"targetUserId":19,"email":"reinstated@example.com","role":"Customer","newStatus":"Active"}', 'identity-service', '127.0.0.1');

