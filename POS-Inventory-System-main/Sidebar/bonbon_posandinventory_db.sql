-- ---------------------------------------------------------------------
--  Bonbon Kitchen POS & Inventory Database
--  Filename : bonbon_posandinventory_db.sql
--  Purpose  : Relational schema + starter data for the
--             POS-Inventory-System-main front-end bundle
--             (inventory.html, pos.html, settings.html, etc.).
--  Notes    : Run this script in MySQL 8+ or MariaDB 10.5+.
--             Adjust credentials as needed before importing.
-- ---------------------------------------------------------------------

DROP DATABASE IF EXISTS `bonbon_posandinventory_db`;
CREATE DATABASE `bonbon_posandinventory_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `bonbon_posandinventory_db`;

SET NAMES utf8mb4;
SET time_zone = '+08:00';

-- ---------------------------------------------------------------------
--  Core reference tables
-- ---------------------------------------------------------------------

CREATE TABLE `users` (
  `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `phone` VARCHAR(25),
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar_url` VARCHAR(255),
  `role` ENUM('admin','manager','cashier','staff') DEFAULT 'staff',
  `status` ENUM('active','disabled') DEFAULT 'active',
  `last_login_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB;

CREATE TABLE `user_settings` (
  `settings_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `language_code` VARCHAR(10) DEFAULT 'en',
  `date_format` VARCHAR(20) DEFAULT 'MM/DD/YYYY',
  `time_format` ENUM('12h','24h') DEFAULT '12h',
  `timezone` VARCHAR(60) DEFAULT 'Asia/Manila',
  `currency_code` VARCHAR(3) DEFAULT 'PHP',
  `number_format` VARCHAR(20) DEFAULT '1,234.56',
  `theme` ENUM('light','dark','system') DEFAULT 'system',
  `two_factor_enabled` TINYINT(1) DEFAULT 0,
  `login_alerts_enabled` TINYINT(1) DEFAULT 1,
  `notifications_enabled` TINYINT(1) DEFAULT 1,
  `auto_update_enabled` TINYINT(1) DEFAULT 1,
  `data_sharing_opt_in` TINYINT(1) DEFAULT 0,
  `last_password_change` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`settings_id`),
  CONSTRAINT `fk_user_settings_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `user_access_logs` (
  `log_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `status` ENUM('success','failed','terminated') NOT NULL,
  `ip_address` VARCHAR(45),
  `device_info` VARCHAR(120),
  `notes` VARCHAR(255),
  `logged_in_at` DATETIME NOT NULL,
  `logged_out_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_user_access_user` (`user_id`),
  CONSTRAINT `fk_user_access_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `product_categories` (
  `category_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(40) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `low_stock_threshold` INT UNSIGNED DEFAULT 10,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB;

CREATE TABLE `products` (
  `product_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_product_id` VARCHAR(20) UNIQUE,
  `category_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT,
  `unit` VARCHAR(30) DEFAULT 'serving',
  `sku` VARCHAR(40) UNIQUE,
  `cost_price` DECIMAL(10,2) DEFAULT 0.00,
  `selling_price` DECIMAL(10,2) NOT NULL,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `reorder_level` INT NOT NULL DEFAULT 10,
  `is_active` TINYINT(1) DEFAULT 1,
  `image_path` VARCHAR(255),
  `created_by` INT UNSIGNED DEFAULT NULL,
  `updated_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`),
  KEY `idx_products_category` (`category_id`),
  CONSTRAINT `fk_products_category`
    FOREIGN KEY (`category_id`)
    REFERENCES `product_categories` (`category_id`),
  CONSTRAINT `fk_products_created_by`
    FOREIGN KEY (`created_by`)
    REFERENCES `users` (`user_id`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_products_updated_by`
    FOREIGN KEY (`updated_by`)
    REFERENCES `users` (`user_id`)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE `product_variants` (
  `variant_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `variant_name` VARCHAR(60) NOT NULL,
  `variant_label` VARCHAR(120),
  `price_override` DECIMAL(10,2) NOT NULL,
  `is_default` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`variant_id`),
  KEY `idx_product_variants_product` (`product_id`),
  CONSTRAINT `fk_product_variants_product`
    FOREIGN KEY (`product_id`)
    REFERENCES `products` (`product_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `orders` (
  `order_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(30) NOT NULL UNIQUE,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `order_source` ENUM('pos','online','phone') DEFAULT 'pos',
  `order_status` ENUM('pending','paid','cancelled','refunded') DEFAULT 'pending',
  `payment_method` ENUM('cash','gcash','card','bank_transfer','other') DEFAULT 'cash',
  `subtotal_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT,
  `placed_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  KEY `idx_orders_user` (`user_id`),
  CONSTRAINT `fk_orders_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE `order_items` (
  `order_item_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `variant_id` INT UNSIGNED DEFAULT NULL,
  `item_name` VARCHAR(180) NOT NULL,
  `size_label` VARCHAR(80),
  `unit_price` DECIMAL(10,2) NOT NULL,
  `quantity` INT NOT NULL,
  `line_total` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `idx_order_items_product` (`product_id`),
  CONSTRAINT `fk_order_items_order`
    FOREIGN KEY (`order_id`)
    REFERENCES `orders` (`order_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product`
    FOREIGN KEY (`product_id`)
    REFERENCES `products` (`product_id`),
  CONSTRAINT `fk_order_items_variant`
    FOREIGN KEY (`variant_id`)
    REFERENCES `product_variants` (`variant_id`)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE `payments` (
  `payment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `payment_method` ENUM('cash','gcash','card','bank_transfer','other') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('pending','completed','failed','refunded') DEFAULT 'completed',
  `paid_at` DATETIME NOT NULL,
  `reference_code` VARCHAR(60),
  `received_by` INT UNSIGNED DEFAULT NULL,
  `notes` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  CONSTRAINT `fk_payments_order`
    FOREIGN KEY (`order_id`)
    REFERENCES `orders` (`order_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_payments_user`
    FOREIGN KEY (`received_by`)
    REFERENCES `users` (`user_id`)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE `inventory_movements` (
  `movement_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `order_id` BIGINT UNSIGNED DEFAULT NULL,
  `movement_type` ENUM('stock-in','sale','adjustment','return') NOT NULL,
  `quantity_change` INT NOT NULL,
  `balance_after` INT NOT NULL,
  `reference_note` VARCHAR(255),
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`movement_id`),
  KEY `idx_movements_product` (`product_id`),
  CONSTRAINT `fk_movements_product`
    FOREIGN KEY (`product_id`)
    REFERENCES `products` (`product_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_movements_order`
    FOREIGN KEY (`order_id`)
    REFERENCES `orders` (`order_id`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_movements_user`
    FOREIGN KEY (`created_by`)
    REFERENCES `users` (`user_id`)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  Seed data
-- ---------------------------------------------------------------------

INSERT INTO `users`
  (`user_id`, `first_name`, `last_name`, `email`, `phone`, `password_hash`, `avatar_url`, `role`, `status`, `last_login_at`)
VALUES
  (1, 'Bonbon', 'Administrator', 'admin@bonbonkitchen.ph', '+63 917 000 1111',
   '$2y$10$bonbonKitchenDemoHashValue1234567890', 'Bonbon Pics/Logo.png', 'admin', 'active', '2024-11-26 08:15:00');

INSERT INTO `user_settings`
  (`user_id`, `language_code`, `date_format`, `time_format`, `timezone`, `currency_code`,
   `number_format`, `theme`, `two_factor_enabled`, `login_alerts_enabled`,
   `notifications_enabled`, `auto_update_enabled`, `data_sharing_opt_in`, `last_password_change`)
VALUES
  (1, 'en', 'MM/DD/YYYY', '12h', 'Asia/Manila', 'PHP',
   '1,234.56', 'system', 1, 1, 1, 1, 0, '2024-11-20 10:00:00');

INSERT INTO `user_access_logs`
  (`user_id`, `status`, `ip_address`, `device_info`, `notes`, `logged_in_at`, `logged_out_at`)
VALUES
  (1, 'success', '192.168.1.20', 'Chrome on Windows', 'Cashier shift - AM', '2024-11-26 08:00:00', '2024-11-26 17:00:00'),
  (1, 'failed', '192.168.1.34', 'Safari on iOS', 'Incorrect password attempt', '2024-11-25 21:12:00', NULL),
  (1, 'success', '192.168.1.10', 'Edge on Windows', 'Manager review', '2024-11-24 09:05:00', '2024-11-24 12:15:00');

INSERT INTO `product_categories`
  (`category_id`, `slug`, `name`, `description`, `low_stock_threshold`)
VALUES
  (1, 'chicken', 'Chicken Flavors', 'Signature double-fried Korean chicken flavors.', 15),
  (2, 'bubbletea', 'Bubble Tea Flavors', 'Milk tea line with customizable sizes.', 20),
  (3, 'cups', 'Cups & Packaging', 'Packaging supplies and disposables.', 200);

INSERT INTO `products`
  (`product_id`, `client_product_id`, `category_id`, `name`, `description`, `unit`, `sku`,
   `cost_price`, `selling_price`, `stock_quantity`, `reorder_level`, `is_active`, `image_path`, `created_by`, `updated_by`)
VALUES
  (1001, 'CHK-0001', 1, 'Cloy Honey Soy', 'Sticky soy garlic glaze with toasted sesame.', 'serving', 'CHK-0001',
   90.00, 149.00, 48, 15, 1, 'Bonbon Pics/cloy honey soy.jpg', 1, 1),
  (1002, 'CHK-0002', 1, 'Boombayah', 'Sweet & spicy gochujang glaze.', 'serving', 'CHK-0002',
   92.00, 149.00, 32, 15, 1, 'Bonbon Pics/boombayah.jpg', 1, 1),
  (1003, 'CHK-0003', 1, 'Honey Butter Night', 'Rich honey butter sauce with herbs.', 'serving', 'CHK-0003',
   94.00, 149.00, 25, 15, 1, 'Bonbon Pics/honey butter night.jpg', 1, 1),
  (1004, 'CHK-0004', 1, 'Oppa BB-Q', 'Korean barbecue glaze with roasted garlic.', 'serving', 'CHK-0004',
   95.00, 149.00, 30, 15, 1, 'Bonbon Pics/oppa bb-q.jpg', 1, 1),
  (1005, 'CHK-0005', 1, 'Chijeu Chikin', 'Cheesy glaze finished with torched mozzarella.', 'serving', 'CHK-0005',
   97.00, 149.00, 26, 15, 1, 'Bonbon Pics/Chijeu Chikin.jpg', 1, 1),
  (1006, 'CHK-0006', 1, 'Olenji Chikin', 'Orange zest glaze with chili crunch.', 'serving', 'CHK-0006',
   95.00, 149.00, 18, 12, 1, 'Bonbon Pics/olenji chikin.jpg', 1, 1),
  (1007, 'CHK-0007', 1, 'Salted Egg Chikin', 'Creamy salted-egg sauce with curry leaves.', 'serving', 'CHK-0007',
   102.00, 159.00, 20, 12, 1, 'Bonbon Pics/salted egg chikin.jpg', 1, 1),
  (1008, 'CHK-0008', 1, 'Yangneom Nom', 'Sweet, sticky, mildly spicy glaze.', 'serving', 'CHK-0008',
   100.00, 159.00, 22, 12, 1, 'Bonbon Pics/yangneom nom.jpg', 1, 1),
  (1009, 'CHK-0009', 1, 'Bonbon Buldak', 'Signature extra-spicy fire chicken.', 'serving', 'CHK-0009',
   104.00, 159.00, 18, 12, 1, 'Bonbon Pics/bonbon buldak.jpg', 1, 1),
  (1010, 'CHK-0010', 1, 'Snow Cheese', 'Milky cheese dusting over sweet glaze.', 'serving', 'CHK-0010',
   103.00, 159.00, 24, 12, 1, 'Bonbon Pics/snow cheese.jpg', 1, 1),
  (1011, 'CHK-0011', 1, 'Honey Mustard Chikin', 'Tangy honey mustard drizzle.', 'serving', 'CHK-0011',
   101.00, 159.00, 20, 12, 1, 'Bonbon Pics/honey mustard chikin.jpg', 1, 1),
  (2001, 'BT-0001', 2, 'Classic Milk Tea', 'Black tea base with chewy pearls.', 'drink', 'BT-0001',
   18.00, 45.00, 58, 25, 1, 'Bonbon Pics/Milktea3.jpg', 1, 1),
  (2002, 'BT-0002', 2, 'Wintermelon Milk Tea', 'Caramelized wintermelon syrup & pearls.', 'drink', 'BT-0002',
   20.00, 50.00, 55, 25, 1, 'Bonbon Pics/Milktea3.jpg', 1, 1),
  (2003, 'BT-0003', 2, 'Okinawa Milk Tea', 'Roasted brown sugar & creamy finish.', 'drink', 'BT-0003',
   20.00, 50.00, 52, 25, 1, 'Bonbon Pics/Milktea3.jpg', 1, 1),
  (2004, 'BT-0004', 2, 'Cookies & Cream Milk Tea', 'Cookie crumble & whipped foam.', 'drink', 'BT-0004',
   28.00, 60.00, 43, 20, 1, 'Bonbon Pics/Milktea1.jpg', 1, 1),
  (2005, 'BT-0005', 2, 'Matcha Milk Tea', 'Ceremonial-grade matcha latte.', 'drink', 'BT-0005',
   26.00, 55.00, 34, 20, 1, 'Bonbon Pics/Milktea4.jpg', 1, 1),
  (2006, 'BT-0006', 2, 'Taro Milk Tea', 'Taro puree with coconut cream.', 'drink', 'BT-0006',
   25.00, 55.00, 40, 20, 1, 'Bonbon Pics/Milktea4.jpg', 1, 1),
  (2007, 'BT-0007', 2, 'Strawberry Milk Tea', 'Strawberry jam & lychee jelly.', 'drink', 'BT-0007',
   24.00, 55.00, 42, 20, 1, 'Bonbon Pics/Milktea1.jpg', 1, 1),
  (2008, 'BT-0008', 2, 'Chocolate Milk Tea', 'Rich cocoa with malt pearls.', 'drink', 'BT-0008',
   24.00, 55.00, 45, 20, 1, 'Bonbon Pics/Milktea4.jpg', 1, 1),
  (2009, 'BT-0009', 2, 'Brown Sugar Milk Tea', 'Thick brown sugar syrup swirl.', 'drink', 'BT-0009',
   32.00, 80.00, 19, 15, 1, 'Bonbon Pics/Milktea2.jpg', 1, 1),
  (3001, 'SUP-0001', 3, '16oz Cup', 'PET 16oz cups for bubble tea line.', 'piece', 'SUP-0001',
   0.60, 1.30, 480, 250, 1, 'Bonbon Pics/Logo.png', 1, 1);

-- Variants for bubble tea drinks (small/medium/large)
INSERT INTO `product_variants`
  (`variant_id`, `product_id`, `variant_name`, `variant_label`, `price_override`, `is_default`)
VALUES
  (6001, 2001, 'small', 'Small (12oz)', 45.00, 0),
  (6002, 2001, 'medium', 'Medium (16oz)', 60.00, 1),
  (6003, 2001, 'large', 'Large (22oz)', 75.00, 0),
  (6004, 2002, 'small', 'Small (12oz)', 50.00, 0),
  (6005, 2002, 'medium', 'Medium (16oz)', 65.00, 1),
  (6006, 2002, 'large', 'Large (22oz)', 80.00, 0),
  (6007, 2003, 'small', 'Small (12oz)', 50.00, 0),
  (6008, 2003, 'medium', 'Medium (16oz)', 65.00, 1),
  (6009, 2003, 'large', 'Large (22oz)', 80.00, 0),
  (6010, 2004, 'small', 'Small (12oz)', 60.00, 0),
  (6011, 2004, 'medium', 'Medium (16oz)', 75.00, 1),
  (6012, 2004, 'large', 'Large (22oz)', 90.00, 0),
  (6013, 2005, 'small', 'Small (12oz)', 55.00, 0),
  (6014, 2005, 'medium', 'Medium (16oz)', 70.00, 1),
  (6015, 2005, 'large', 'Large (22oz)', 85.00, 0),
  (6016, 2006, 'small', 'Small (12oz)', 55.00, 0),
  (6017, 2006, 'medium', 'Medium (16oz)', 70.00, 1),
  (6018, 2006, 'large', 'Large (22oz)', 85.00, 0),
  (6019, 2007, 'small', 'Small (12oz)', 55.00, 0),
  (6020, 2007, 'medium', 'Medium (16oz)', 70.00, 1),
  (6021, 2007, 'large', 'Large (22oz)', 85.00, 0),
  (6022, 2008, 'small', 'Small (12oz)', 55.00, 0),
  (6023, 2008, 'medium', 'Medium (16oz)', 70.00, 1),
  (6024, 2008, 'large', 'Large (22oz)', 85.00, 0),
  (6025, 2009, 'small', 'Small (12oz)', 80.00, 0),
  (6026, 2009, 'medium', 'Medium (16oz)', 95.00, 1),
  (6027, 2009, 'large', 'Large (22oz)', 110.00, 0);

-- POS sample orders
INSERT INTO `orders`
  (`order_id`, `order_number`, `user_id`, `order_source`, `order_status`, `payment_method`,
   `subtotal_amount`, `discount_amount`, `tax_amount`, `total_amount`, `notes`, `placed_at`)
VALUES
  (1, 'POS-20241125-0001', 1, 'pos', 'paid', 'cash',
   528.00, 0.00, 0.00, 528.00, 'Less spicy on chicken.', '2024-11-25 11:05:00'),
  (2, 'POS-20241126-0002', 1, 'pos', 'paid', 'gcash',
   244.00, 0.00, 0.00, 244.00, 'Please seal drink tightly.', '2024-11-26 18:45:00');

INSERT INTO `order_items`
  (`order_id`, `product_id`, `variant_id`, `item_name`, `size_label`, `unit_price`, `quantity`, `line_total`)
VALUES
  (1, 1001, NULL, 'Cloy Honey Soy', NULL, 149.00, 2, 298.00),
  (1, 2001, 6002, 'Classic Milk Tea', 'Medium', 60.00, 2, 120.00),
  (1, 2009, 6027, 'Brown Sugar Milk Tea', 'Large', 110.00, 1, 110.00),
  (2, 1010, NULL, 'Snow Cheese', NULL, 159.00, 1, 159.00),
  (2, 2005, 6015, 'Matcha Milk Tea', 'Large', 85.00, 1, 85.00);

INSERT INTO `payments`
  (`payment_id`, `order_id`, `payment_method`, `amount`, `status`, `paid_at`, `reference_code`, `received_by`, `notes`)
VALUES
  (1, 1, 'cash', 528.00, 'completed', '2024-11-25 11:07:00', 'SHIFT1-CASH-001', 1, 'Exact cash received.'),
  (2, 2, 'gcash', 244.00, 'completed', '2024-11-26 18:47:00', 'GCASH-REF-8891', 1, 'GCash confirmation screenshot logged.');

-- Inventory movement log (initial stock-in + sample sales)
INSERT INTO `inventory_movements`
  (`product_id`, `order_id`, `movement_type`, `quantity_change`, `balance_after`, `reference_note`, `created_by`, `created_at`)
VALUES
  (1001, NULL, 'stock-in', 50, 50, 'Initial chicken prep batch', 1, '2024-11-20 08:00:00'),
  (1001, 1, 'sale', -2, 48, 'POS-20241125-0001', 1, '2024-11-25 11:05:00'),
  (1002, NULL, 'stock-in', 32, 32, 'Initial chicken prep batch', 1, '2024-11-20 08:00:00'),
  (1003, NULL, 'stock-in', 25, 25, 'Initial chicken prep batch', 1, '2024-11-20 08:00:00'),
  (1004, NULL, 'stock-in', 30, 30, 'Initial chicken prep batch', 1, '2024-11-20 08:00:00'),
  (1005, NULL, 'stock-in', 26, 26, 'Initial chicken prep batch', 1, '2024-11-20 08:00:00'),
  (1006, NULL, 'stock-in', 18, 18, 'Initial chicken prep batch', 1, '2024-11-20 08:00:00'),
  (1007, NULL, 'stock-in', 20, 20, 'Initial chicken prep batch', 1, '2024-11-20 08:00:00'),
  (1008, NULL, 'stock-in', 22, 22, 'Initial chicken prep batch', 1, '2024-11-20 08:00:00'),
  (1009, NULL, 'stock-in', 18, 18, 'Initial chicken prep batch', 1, '2024-11-20 08:00:00'),
  (1010, NULL, 'stock-in', 25, 25, 'Initial chicken prep batch', 1, '2024-11-20 08:00:00'),
  (1010, 2, 'sale', -1, 24, 'POS-20241126-0002', 1, '2024-11-26 18:45:00'),
  (1011, NULL, 'stock-in', 20, 20, 'Initial chicken prep batch', 1, '2024-11-20 08:00:00'),
  (2001, NULL, 'stock-in', 60, 60, 'Milk tea prep day', 1, '2024-11-21 09:00:00'),
  (2001, 1, 'sale', -2, 58, 'POS-20241125-0001', 1, '2024-11-25 11:05:00'),
  (2002, NULL, 'stock-in', 55, 55, 'Milk tea prep day', 1, '2024-11-21 09:00:00'),
  (2003, NULL, 'stock-in', 52, 52, 'Milk tea prep day', 1, '2024-11-21 09:00:00'),
  (2004, NULL, 'stock-in', 43, 43, 'Milk tea prep day', 1, '2024-11-21 09:00:00'),
  (2005, NULL, 'stock-in', 35, 35, 'Milk tea prep day', 1, '2024-11-21 09:00:00'),
  (2005, 2, 'sale', -1, 34, 'POS-20241126-0002', 1, '2024-11-26 18:45:00'),
  (2006, NULL, 'stock-in', 40, 40, 'Milk tea prep day', 1, '2024-11-21 09:00:00'),
  (2007, NULL, 'stock-in', 42, 42, 'Milk tea prep day', 1, '2024-11-21 09:00:00'),
  (2008, NULL, 'stock-in', 45, 45, 'Milk tea prep day', 1, '2024-11-21 09:00:00'),
  (2009, NULL, 'stock-in', 20, 20, 'Milk tea prep day', 1, '2024-11-21 09:00:00'),
  (2009, 1, 'sale', -1, 19, 'POS-20241125-0001', 1, '2024-11-25 11:05:00'),
  (3001, NULL, 'stock-in', 500, 500, 'Opening inventory for cups', 1, '2024-11-19 07:30:00'),
  (3001, NULL, 'sale', -20, 480, 'Cups consumed for bubble tea line', 1, '2024-11-25 20:00:00');

-- ---------------------------------------------------------------------
--  End of file
-- ---------------------------------------------------------------------

