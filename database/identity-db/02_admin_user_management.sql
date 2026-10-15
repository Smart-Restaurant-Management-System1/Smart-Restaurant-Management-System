-- =======================================================
-- Smart Restaurant Management System
-- Identity Service: Admin User Management Migration (SR-218)
-- =======================================================

USE restaurant_identity_db;

-- 1. Add Status column if it does not already exist
SET @colExists = (SELECT COUNT(*) FROM information_schema.columns 
                  WHERE table_schema = 'restaurant_identity_db' 
                    AND table_name = 'Users' 
                    AND column_name = 'Status');

SET @stmt = IF(@colExists = 0, 
    'ALTER TABLE `Users` ADD COLUMN `Status` VARCHAR(20) NOT NULL DEFAULT ''Active'' AFTER `IsActive`, ADD COLUMN `DeletedAt` DATETIME NULL AFTER `UpdatedAt`, ADD INDEX `idx_users_status` (`Status`);', 
    'SELECT ''Column Status already exists'';');
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

-- 2. Synchronize existing records so IsActive aligns with Status
UPDATE `Users` 
SET `Status` = CASE 
    WHEN `IsActive` = 1 THEN 'Active'
    ELSE 'Blocked'
END
WHERE `Status` IS NULL OR `Status` = '' OR `Status` = 'Active';

