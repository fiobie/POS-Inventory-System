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
  `client_product_id` VARCHAR(20) UNIQUE COMMENT 'Organized format: CATEGORY-#### (e.g., CHK-0001, BT-0001, SUP-0001). Prefixes: CHK=Chicken, BT=Bubble Tea, SUP=Supplies/Packaging, ING=Ingredients, PKG=Packaging',
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

-- ---------------------------------------------------------------------
--  Ingredients & Recipe Management Tables
-- ---------------------------------------------------------------------

CREATE TABLE `ingredients` (
  `ingredient_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `unit` VARCHAR(30) NOT NULL COMMENT 'e.g., g, ml, pcs, L, kg',
  `unit_type` ENUM('weight','volume','count','other') NOT NULL,
  `purchase_unit` VARCHAR(30) NOT NULL COMMENT 'e.g., 1L, 500g, 22pcs',
  `purchase_price` DECIMAL(10,2) NOT NULL COMMENT 'Price per purchase_unit',
  `cost_per_unit` DECIMAL(10,4) NOT NULL COMMENT 'Calculated: purchase_price / units_per_purchase',
  `current_stock` DECIMAL(12,4) NOT NULL DEFAULT 0.0000 COMMENT 'Current quantity in base unit',
  `reorder_level` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  `storage_location` VARCHAR(100),
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ingredient_id`),
  UNIQUE KEY `uk_ingredients_name_unit` (`name`, `unit`)
) ENGINE=InnoDB;

CREATE TABLE `recipes` (
  `recipe_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `recipe_name` VARCHAR(150) NOT NULL,
  `serving_size` VARCHAR(50) COMMENT 'e.g., 1 serving, 5pcs chicken',
  `total_cost` DECIMAL(10,2) NOT NULL COMMENT 'Total ingredient cost per serving',
  `labor_cost` DECIMAL(10,2) DEFAULT 0.00,
  `packaging_cost` DECIMAL(10,2) DEFAULT 0.00,
  `total_recipe_cost` DECIMAL(10,2) NOT NULL COMMENT 'total_cost + labor_cost + packaging_cost',
  `notes` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`recipe_id`),
  KEY `idx_recipes_product` (`product_id`),
  CONSTRAINT `fk_recipes_product`
    FOREIGN KEY (`product_id`)
    REFERENCES `products` (`product_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `recipe_items` (
  `recipe_item_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `recipe_id` INT UNSIGNED NOT NULL,
  `ingredient_id` INT UNSIGNED NOT NULL,
  `quantity` DECIMAL(10,4) NOT NULL COMMENT 'Quantity needed per serving',
  `unit` VARCHAR(30) NOT NULL COMMENT 'Unit of measurement',
  `cost_per_serving` DECIMAL(10,4) NOT NULL COMMENT 'Calculated cost for this ingredient per serving',
  `notes` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`recipe_item_id`),
  KEY `idx_recipe_items_recipe` (`recipe_id`),
  KEY `idx_recipe_items_ingredient` (`ingredient_id`),
  CONSTRAINT `fk_recipe_items_recipe`
    FOREIGN KEY (`recipe_id`)
    REFERENCES `recipes` (`recipe_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_recipe_items_ingredient`
    FOREIGN KEY (`ingredient_id`)
    REFERENCES `ingredients` (`ingredient_id`)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE `ingredient_movements` (
  `movement_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ingredient_id` INT UNSIGNED NOT NULL,
  `order_id` BIGINT UNSIGNED DEFAULT NULL,
  `recipe_id` INT UNSIGNED DEFAULT NULL,
  `movement_type` ENUM('stock-in','consumption','adjustment','return','waste') NOT NULL,
  `quantity_change` DECIMAL(12,4) NOT NULL,
  `balance_after` DECIMAL(12,4) NOT NULL,
  `reference_note` VARCHAR(255),
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`movement_id`),
  KEY `idx_ingredient_movements_ingredient` (`ingredient_id`),
  KEY `idx_ingredient_movements_order` (`order_id`),
  KEY `idx_ingredient_movements_recipe` (`recipe_id`),
  CONSTRAINT `fk_ingredient_movements_ingredient`
    FOREIGN KEY (`ingredient_id`)
    REFERENCES `ingredients` (`ingredient_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_ingredient_movements_order`
    FOREIGN KEY (`order_id`)
    REFERENCES `orders` (`order_id`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_ingredient_movements_recipe`
    FOREIGN KEY (`recipe_id`)
    REFERENCES `recipes` (`recipe_id`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_ingredient_movements_user`
    FOREIGN KEY (`created_by`)
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
  (3, 'cups', 'Cups & Packaging', 'Packaging supplies and disposables.', 200),
  (4, 'packaging', 'Packaging', 'Packaging supplies tracked as products.', 300);

INSERT INTO `products`
  (`product_id`, `client_product_id`, `category_id`, `name`, `description`, `unit`, `sku`,
   `cost_price`, `selling_price`, `stock_quantity`, `reorder_level`, `is_active`, `image_path`, `created_by`, `updated_by`)
VALUES
  -- Cost prices updated from recipe data (total_recipe_cost)
  (1001, 'CHK-0001', 1, 'Cloy Honey Soy', 'Sticky soy garlic glaze with toasted sesame.', 'serving', 'CHK-0001',
   43.75, 149.00, 48, 15, 1, 'Bonbon Pics/cloy honey soy.jpg', 1, 1),
  (1002, 'CHK-0002', 1, 'Boombayah', 'Sweet & spicy gochujang glaze.', 'serving', 'CHK-0002',
   45.50, 149.00, 32, 15, 1, 'Bonbon Pics/boombayah.jpg', 1, 1),
  (1003, 'CHK-0003', 1, 'Honey Butter Night', 'Rich honey butter sauce with herbs.', 'serving', 'CHK-0003',
   44.80, 149.00, 25, 15, 1, 'Bonbon Pics/honey butter night.jpg', 1, 1),
  (1004, 'CHK-0004', 1, 'Oppa BB-Q', 'Korean barbecue glaze with roasted garlic.', 'serving', 'CHK-0004',
   49.50, 149.00, 30, 15, 1, 'Bonbon Pics/oppa bb-q.jpg', 1, 1),
  (1005, 'CHK-0005', 1, 'Chijeu Chikin', 'Cheesy glaze finished with torched mozzarella.', 'serving', 'CHK-0005',
   45.58, 149.00, 26, 15, 1, 'Bonbon Pics/Chijeu Chikin.jpg', 1, 1),
  (1006, 'CHK-0006', 1, 'Olenji Chikin', 'Orange zest glaze with chili crunch.', 'serving', 'CHK-0006',
   45.50, 149.00, 18, 12, 1, 'Bonbon Pics/olenji chikin.jpg', 1, 1),
  (1007, 'CHK-0007', 1, 'Salted Egg Chikin', 'Creamy salted-egg sauce with curry leaves.', 'serving', 'CHK-0007',
   73.80, 159.00, 20, 12, 1, 'Bonbon Pics/salted egg chikin.jpg', 1, 1),
  (1008, 'CHK-0008', 1, 'Yangneom Nom', 'Sweet, sticky, mildly spicy glaze.', 'serving', 'CHK-0008',
   49.50, 159.00, 22, 12, 1, 'Bonbon Pics/yangneom nom.jpg', 1, 1),
  (1009, 'CHK-0009', 1, 'Bonbon Buldak', 'Signature extra-spicy fire chicken.', 'serving', 'CHK-0009',
   55.00, 159.00, 18, 12, 1, 'Bonbon Pics/bonbon buldak.jpg', 1, 1),
  (1010, 'CHK-0010', 1, 'Snow Cheese', 'Milky cheese dusting over sweet glaze.', 'serving', 'CHK-0010',
   76.90, 159.00, 24, 12, 1, 'Bonbon Pics/snow cheese.jpg', 1, 1),
  (1011, 'CHK-0011', 1, 'Honey Mustard Chikin', 'Tangy honey mustard drizzle.', 'serving', 'CHK-0011',
   55.00, 159.00, 20, 12, 1, 'Bonbon Pics/honey mustard chikin.jpg', 1, 1),
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
  (3001, 'SUP-0001', 2, '16oz Cup', 'PET 16oz cups for bubble tea line.', 'piece', 'SUP-0001',
   0.60, 1.30, 480, 250, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (4001, 'PKG-0001', 4, 'Spaghetti Box', 'Packaging box for chicken servings.', 'piece', 'PKG-0001',
   4.00, 4.00, 1000, 200, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (4002, 'PKG-0002', 4, 'Egg (Packaging)', 'Egg used for coating or garnish.', 'piece', 'PKG-0002',
   5.00, 5.00, 1000, 200, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (4003, 'PKG-0003', 4, 'Aluminum Foil Sheet', 'Foil sheets for food wrap.', 'piece', 'PKG-0003',
   2.00, 2.00, 1500, 300, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (4004, 'PKG-0004', 4, 'Paper Bag', 'Take-out paper bags.', 'piece', 'PKG-0004',
  3.00, 3.00, 1200, 300, 1, 'Bonbon Pics/Logo.png', 1, 1);

INSERT INTO `products`
  (`product_id`, `client_product_id`, `category_id`, `name`, `description`, `unit`, `sku`,
   `cost_price`, `selling_price`, `stock_quantity`, `reorder_level`, `supplier_id`, `image_url`, `is_active`, `created_by`)
VALUES
  (2010, 'BT-1010', 2, 'Brewed Assam Black Tea', 'Batch of brewed Assam tea.', 'batch', 'BT-1010',
   0.00, 0.00, 8, 3, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (2011, 'BT-1011', 2, 'Simple Syrup', 'Batch of simple syrup.', 'batch', 'BT-1011',
   0.00, 0.00, 96, 20, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (2012, 'BT-1012', 2, 'Milk Syrup (Prep)', 'Batch of milk syrup.', 'batch', 'BT-1012',
   0.00, 0.00, 24, 10, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (2013, 'BT-1013', 2, 'Brown Sugar Sauce', 'Batch of brown sugar sauce.', 'batch', 'BT-1013',
   0.00, 0.00, 60, 15, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (2014, 'BT-1014', 2, 'Brown Sugar Syrup (Prep)', 'Batch of muscovado syrup.', 'batch', 'BT-1014',
   0.00, 0.00, 16, 6, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (2015, 'BT-1015', 2, 'Tapioca Pearls (Prep)', 'Batch of cooked tapioca pearls.', 'batch', 'BT-1015',
   0.00, 0.00, 11, 5, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (2016, 'BT-1016', 2, 'Coffee Jelly (Prep)', 'Batch of coffee jelly.', 'batch', 'BT-1016',
   0.00, 0.00, 13, 5, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (2017, 'BT-1017', 2, 'Egg Pudding (Prep)', 'Batch of egg pudding.', 'batch', 'BT-1017',
   0.00, 0.00, 20, 8, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (2018, 'BT-1018', 2, 'Cream Puff (Prep)', 'Batch of cream puff.', 'batch', 'BT-1018',
   0.00, 0.00, 10, 5, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (2019, 'BT-1019', 2, 'Cream Cheese (Prep)', 'Batch of cream cheese.', 'batch', 'BT-1019',
   0.00, 0.00, 8, 4, 1, 'Bonbon Pics/Logo.png', 1, 1),
  (2020, 'BT-1020', 2, 'Rock Salt and Cheese (Prep)', 'Batch of rock salt and cheese.', 'batch', 'BT-1020',
   0.00, 0.00, 6, 3, 1, 'Bonbon Pics/Logo.png', 1, 1);

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
--  Ingredients Data (from COST PER ORDER.xlsx)
-- ---------------------------------------------------------------------

INSERT INTO `ingredients`
  (`ingredient_id`, `name`, `unit`, `unit_type`, `purchase_unit`, `purchase_price`, `cost_per_unit`, `current_stock`, `reorder_level`)
VALUES
  -- Chicken & Proteins
  (5001, 'Chicken', 'pcs', 'count', '22pcs', 160.00, 7.2727, 500.0000, 100.0000),
  
  -- Sauces & Condiments
  (5002, 'Soy Sauce', 'ml', 'volume', '1L', 35.00, 0.0350, 5000.0000, 1000.0000),
  (5003, 'Honey', 'ml', 'volume', '750ml', 130.00, 0.1733, 3000.0000, 500.0000),
  (5004, 'Hot Sauce', 'ml', 'volume', '165g', 38.00, 0.2303, 500.0000, 100.0000),
  (5005, 'Ketchup', 'ml', 'volume', '320g', 26.00, 0.0813, 1000.0000, 200.0000),
  (5006, 'Gochujang', 'g', 'weight', '170g', 71.00, 0.4176, 500.0000, 100.0000),
  
  -- Dairy & Cheese
  (5007, 'Milk', 'ml', 'volume', '1L', 69.00, 0.0690, 2000.0000, 500.0000),
  (5008, 'Butter', 'g', 'weight', '200g', 40.00, 0.2000, 1000.0000, 200.0000),
  (5009, 'Cheese', 'g', 'weight', '500g', 91.00, 0.1820, 2000.0000, 500.0000),
  (5010, 'Milk Powder', 'g', 'weight', '1000g', 259.00, 0.2590, 2000.0000, 500.0000),
  (5011, 'Cheese Powder', 'g', 'weight', '100g', 55.00, 0.5500, 500.0000, 100.0000),
  (5012, 'Mayo', 'g', 'weight', '3.5L', 700.00, 0.2011, 3000.0000, 500.0000),
  
  -- Spices & Seasonings
  (5013, 'Salt', 'g', 'weight', '400g', 10.00, 0.0250, 2000.0000, 500.0000),
  (5014, 'Garlic', 'g', 'weight', '500g', 40.00, 0.0800, 1000.0000, 200.0000),
  (5015, 'Brown Sugar', 'g', 'weight', '1000g', 60.00, 0.0600, 2000.0000, 500.0000),
  (5016, 'Sugar', 'g', 'weight', '1000g', 50.00, 0.0500, 2000.0000, 500.0000),
  (5017, 'Powdered Sugar', 'g', 'weight', '450g', 85.00, 0.1889, 1000.0000, 200.0000),
  (5018, 'Garlic Powder', 'g', 'weight', '1KG', 145.00, 0.1450, 500.0000, 100.0000),
  (5019, 'Onion Powder', 'g', 'weight', '1KG', 205.00, 0.2050, 500.0000, 100.0000),
  (5020, 'Chili Flakes', 'g', 'weight', '100g', 25.00, 0.2500, 200.0000, 50.0000),
  (5021, 'Pepper', 'g', 'weight', '100g', 30.00, 0.3000, 200.0000, 50.0000),
  (5022, 'Parsley', 'g', 'weight', '50g', 65.00, 1.3000, 200.0000, 50.0000),
  (5023, 'Onion Springs', 'g', 'weight', '100g', 20.00, 0.2000, 200.0000, 50.0000),
  
  -- Thickeners & Binders
  (5024, 'Cornstarch', 'g', 'weight', '1000g', 38.00, 0.0380, 2000.0000, 500.0000),
  (5025, 'Flour', 'g', 'weight', '1000g', 45.00, 0.0450, 2000.0000, 500.0000),
  
  -- Special Ingredients
  (5026, 'Salted Egg Powder', 'g', 'weight', '1kg', 669.00, 0.6690, 500.0000, 100.0000),
  (5027, 'Mustard Paste', 'ml', 'volume', '200g', 85.00, 0.4250, 500.0000, 100.0000),
  
  -- Eggs & Coating
  (5028, 'Egg', 'pcs', 'count', '30pcs', 150.00, 5.0000, 200.0000, 50.0000),
  
  -- Garnish
  (5029, 'Garnish', 'serving', 'count', 'bulk', 1.00, 1.0000, 1000.0000, 200.0000),
  
  -- Packaging
  (5030, 'Spaghetti Box', 'pcs', 'count', 'bulk', 4.00, 4.0000, 1000.0000, 200.0000),
  (5031, 'Water', 'ml', 'volume', 'bulk', 0.00, 0.0000, 10000.0000, 1000.0000),
  (5032, 'Orange Juice', 'ml', 'volume', '1L', 88.00, 0.0880, 1000.0000, 200.0000),
  (5033, 'Vinegar', 'ml', 'volume', '1L', 44.00, 0.0440, 1000.0000, 200.0000);

INSERT INTO `ingredients`
  (`ingredient_id`, `name`, `unit`, `unit_type`, `purchase_unit`, `purchase_price`, `cost_per_unit`, `current_stock`, `reorder_level`)
VALUES
  (5034, 'Black Tea', 'ml', 'volume', '1L', 100.00, 0.1000, 5000.0000, 1000.0000),
  (5035, 'Milk Syrup', 'ml', 'volume', '1L', 200.00, 0.2000, 2000.0000, 400.0000),
  (5036, 'Non-Dairy Creamer', 'g', 'weight', '1KG', 250.00, 0.2500, 2000.0000, 400.0000),
  (5037, 'Wintermelon Syrup', 'ml', 'volume', '1L', 180.00, 0.1800, 2000.0000, 400.0000),
  (5038, 'Brown Sugar Syrup', 'ml', 'volume', '1L', 150.00, 0.1500, 2000.0000, 400.0000),
  (5039, 'Matcha Powder', 'g', 'weight', '500g', 550.00, 1.1000, 1000.0000, 200.0000),
  (5040, 'Taro Powder', 'g', 'weight', '500g', 400.00, 0.8000, 1000.0000, 200.0000),
  (5041, 'Chocolate Syrup', 'ml', 'volume', '1L', 220.00, 0.2200, 2000.0000, 400.0000),
  (5042, 'Strawberry Syrup', 'ml', 'volume', '1L', 240.00, 0.2400, 2000.0000, 400.0000),
  (5043, 'Pearls', 'g', 'weight', '1KG', 160.00, 0.1600, 2000.0000, 400.0000),
  (5044, '16oz Cup', 'pcs', 'count', '100pcs', 130.00, 1.3000, 100.0000, 50.0000),
  (5045, 'Straw', 'pcs', 'count', '100pcs', 30.00, 0.3000, 100.0000, 50.0000),
  (5046, 'Lid', 'pcs', 'count', '100pcs', 25.00, 0.2500, 100.0000, 50.0000),
  (5047, 'Sticker', 'pcs', 'count', '100pcs', 20.00, 0.2000, 100.0000, 50.0000),
  (5048, 'Plastic', 'pcs', 'count', '100pcs', 10.00, 0.1000, 100.0000, 50.0000);

INSERT INTO `ingredients`
  (`ingredient_id`, `name`, `unit`, `unit_type`, `purchase_unit`, `purchase_price`, `cost_per_unit`, `current_stock`, `reorder_level`)
VALUES
  (5049, 'Assam Loose Tea', 'g', 'weight', '250g', 0.00, 0.0000, 500.0000, 100.0000),
  (5050, 'White Sugar', 'g', 'weight', '1KG', 0.00, 0.0000, 2000.0000, 400.0000),
  (5051, 'Condensed Milk', 'ml', 'volume', '1L', 0.00, 0.0000, 500.0000, 200.0000),
  (5052, 'Evaporated Milk', 'ml', 'volume', '1L', 0.00, 0.0000, 500.0000, 200.0000),
  (5053, 'Muscovado', 'g', 'weight', '1KG', 0.00, 0.0000, 1000.0000, 200.0000),
  (5054, 'Nescafe', 'g', 'weight', '250g', 0.00, 0.0000, 200.0000, 50.0000),
  (5055, 'Jelly Powder', 'g', 'weight', '500g', 0.00, 0.0000, 200.0000, 50.0000),
  (5056, 'Egg Pudding Powder', 'g', 'weight', '500g', 0.00, 0.0000, 500.0000, 100.0000),
  (5057, 'Salted Cream Cheese', 'g', 'weight', '1KG', 0.00, 0.0000, 1000.0000, 200.0000),
  (5058, 'Tapioca Pearls', 'g', 'weight', '1KG', 0.00, 0.0000, 2000.0000, 400.0000);

-- ---------------------------------------------------------------------
--  Recipes Data (from COST PER ORDER.xlsx)
-- ---------------------------------------------------------------------

-- Recipe for Cloy Honey Soy (Honey Soy)
INSERT INTO `recipes`
  (`recipe_id`, `product_id`, `recipe_name`, `serving_size`, `total_cost`, `labor_cost`, `packaging_cost`, `total_recipe_cost`, `notes`)
VALUES
  (7001, 1001, 'Cloy Honey Soy Recipe', '3pcs chicken', 38.75, 1.00, 4.00, 43.75, 'Sticky soy garlic glaze with toasted sesame'),
  (7002, 1002, 'Boombayah Recipe', '5pcs chicken', 40.50, 1.00, 4.00, 45.50, 'Sweet & spicy gochujang glaze'),
  (7003, 1003, 'Honey Butter Night Recipe', '5pcs chicken', 39.80, 1.00, 4.00, 44.80, 'Rich honey butter sauce with herbs'),
  (7004, 1005, 'Chijeu Chikin Recipe', '5pcs chicken', 40.58, 1.00, 4.00, 45.58, 'Cheesy glaze finished with torched mozzarella'),
  (7005, 1004, 'Oppa BB-Q Recipe', '5pcs chicken', 44.50, 1.00, 4.00, 49.50, 'Korean barbecue glaze with roasted garlic'),
  (7006, 1010, 'Snow Cheese Recipe', '5pcs chicken', 71.90, 1.00, 4.00, 76.90, 'Milky cheese dusting over sweet glaze'),
  (7007, 1011, 'Honey Mustard Chikin Recipe', '5pcs chicken', 50.00, 1.00, 4.00, 55.00, 'Tangy honey mustard drizzle'),
  (7008, 1007, 'Salted Egg Recipe', '5pcs chicken', 68.80, 1.00, 4.00, 73.80, 'Creamy salted-egg sauce with curry leaves'),
  (7009, 1006, 'Olenji Chikin Recipe', '5pcs chicken', 40.50, 1.00, 4.00, 45.50, 'Orange zest glaze with chili crunch'),
  (7010, 1008, 'Yangneom Nom Recipe', '5pcs chicken', 44.50, 1.00, 4.00, 49.50, 'Sweet, sticky, mildly spicy glaze'),
  (7011, 1009, 'Bonbon Buldak Recipe', '5pcs chicken', 50.00, 1.00, 4.00, 55.00, 'Signature extra-spicy fire chicken');

-- Recipe Items for Cloy Honey Soy
INSERT INTO `recipe_items`
  (`recipe_id`, `ingredient_id`, `quantity`, `unit`, `cost_per_serving`)
VALUES
  -- Cloy Honey Soy (3pcs chicken)
  (7001, 5001, 3.0000, 'pcs', 21.8181),  -- Chicken: 7.2727 * 3
  (7001, 5002, 15.0000, 'ml', 0.5250),   -- Soy Sauce: 0.035 * 15
  (7001, 5003, 20.0000, 'ml', 3.4660),   -- Honey: 0.1733 * 20
  (7001, 5013, 1.2500, 'g', 0.0313),    -- Salt: 0.025 * 1.25
  (7001, 5014, 15.0000, 'g', 1.2000),   -- Garlic: 0.08 * 15
  (7001, 5015, 15.0000, 'g', 0.9000),    -- Brown Sugar: 0.06 * 15
  (7001, 5024, 5.0000, 'g', 0.1900),    -- Cornstarch: 0.038 * 5
  (7001, 5028, 1.0000, 'pcs', 5.0000),  -- Egg
  (7001, 5024, 0.5000, 'g', 0.0190),    -- Cornstarch (coating)
  (7001, 5029, 1.0000, 'serving', 1.0000), -- Garnish
  (7001, 5030, 1.0000, 'pcs', 4.0000),  -- Spaghetti Box
  
  -- Boombayah (5pcs chicken)
  (7002, 5001, 5.0000, 'pcs', 36.3635),  -- Chicken: 7.2727 * 5
  (7002, 5004, 20.0000, 'ml', 4.6060),   -- Hot Sauce: 0.2303 * 20
  (7002, 5005, 30.0000, 'ml', 2.4390),   -- Ketchup: 0.0813 * 30
  (7002, 5002, 15.0000, 'ml', 0.5250),   -- Soy Sauce: 0.035 * 15
  (7002, 5015, 15.0000, 'g', 0.9000),    -- Brown Sugar: 0.06 * 15
  (7002, 5020, 0.5000, 'g', 0.1250),    -- Chili Flakes: 0.25 * 0.5
  (7002, 5028, 1.0000, 'pcs', 5.0000),  -- Egg
  (7002, 5024, 0.5000, 'g', 0.0190),    -- Cornstarch (coating)
  (7002, 5029, 1.0000, 'serving', 1.0000), -- Garnish
  (7002, 5030, 1.0000, 'pcs', 4.0000),  -- Spaghetti Box
  
  -- Honey Butter Night (5pcs chicken)
  (7003, 5001, 5.0000, 'pcs', 36.3635),  -- Chicken: 7.2727 * 5
  (7003, 5008, 20.0000, 'g', 4.0000),   -- Butter: 0.2 * 20
  (7003, 5003, 15.0000, 'ml', 2.5995),   -- Honey: 0.1733 * 15
  (7003, 5015, 15.0000, 'g', 0.9000),    -- Brown Sugar: 0.06 * 15
  (7003, 5013, 1.2500, 'g', 0.0313),    -- Salt: 0.025 * 1.25
  (7003, 5023, 0.5000, 'g', 0.1000),    -- Onion Springs: 0.2 * 0.5
  (7003, 5024, 2.5000, 'g', 0.0950),    -- Cornstarch: 0.038 * 2.5
  (7003, 5028, 1.0000, 'pcs', 5.0000),  -- Egg
  (7003, 5024, 0.5000, 'g', 0.0190),    -- Cornstarch (coating)
  (7003, 5029, 1.0000, 'serving', 1.0000), -- Garnish
  (7003, 5030, 1.0000, 'pcs', 4.0000),  -- Spaghetti Box
  
  -- Chijeu Chikin (5pcs chicken)
  (7004, 5001, 5.0000, 'pcs', 36.3635),  -- Chicken: 7.2727 * 5
  (7004, 5015, 15.0000, 'g', 0.9000),    -- Brown Sugar: 0.06 * 15
  (7004, 5007, 30.0000, 'ml', 2.0700),   -- Milk: 0.069 * 30
  (7004, 5005, 5.0000, 'ml', 0.4065),    -- Ketchup: 0.0813 * 5
  (7004, 5031, 45.0000, 'ml', 0.0000),   -- Water
  (7004, 5024, 5.0000, 'g', 0.1900),    -- Cornstarch: 0.038 * 5
  (7004, 5002, 5.0000, 'ml', 0.1750),   -- Soy Sauce: 0.035 * 5
  (7004, 5013, 1.2500, 'g', 0.0313),    -- Salt: 0.025 * 1.25
  (7004, 5009, 25.0000, 'g', 4.5500),    -- Cheese: 0.182 * 25
  (7004, 5028, 1.0000, 'pcs', 5.0000),  -- Egg
  (7004, 5024, 0.5000, 'g', 0.0190),    -- Cornstarch (coating)
  (7004, 5029, 1.0000, 'serving', 1.0000), -- Garnish
  (7004, 5030, 1.0000, 'pcs', 4.0000),  -- Spaghetti Box
  
  -- Oppa BB-Q (5pcs chicken)
  (7005, 5001, 5.0000, 'pcs', 36.3635),  -- Chicken: 7.2727 * 5
  (7005, 5002, 15.0000, 'ml', 0.5250),   -- Soy Sauce: 0.035 * 15
  (7005, 5006, 5.0000, 'g', 2.0880),    -- Gochujang: 0.4176 * 5
  (7005, 5007, 30.0000, 'ml', 2.0700),   -- Milk: 0.069 * 30
  (7005, 5009, 25.0000, 'g', 4.5500),    -- Cheese: 0.182 * 25
  (7005, 5031, 45.0000, 'ml', 0.0000),   -- Water
  (7005, 5024, 5.0000, 'g', 0.1900),    -- Cornstarch: 0.038 * 5
  (7005, 5028, 1.0000, 'pcs', 5.0000),  -- Egg
  (7005, 5024, 0.5000, 'g', 0.0190),    -- Cornstarch (coating)
  (7005, 5029, 1.0000, 'serving', 1.0000), -- Garnish
  (7005, 5030, 1.0000, 'pcs', 4.0000),  -- Spaghetti Box
  
  -- Snow Cheese (5pcs chicken)
  (7006, 5001, 5.0000, 'pcs', 36.3635),  -- Chicken: 7.2727 * 5
  (7006, 5010, 30.0000, 'g', 7.7700),    -- Milk Powder: 0.259 * 30
  (7006, 5011, 30.0000, 'g', 16.5000),   -- Cheese Powder: 0.55 * 30
  (7006, 5017, 30.0000, 'g', 5.6670),    -- Powdered Sugar: 0.1889 * 30
  (7006, 5018, 1.5000, 'g', 0.2175),    -- Garlic Powder: 0.145 * 1.5
  (7006, 5019, 1.5000, 'g', 0.3075),    -- Onion Powder: 0.205 * 1.5
  (7006, 5022, 3.0000, 'g', 3.9000),    -- Parsley: 1.3 * 3
  (7006, 5028, 1.0000, 'pcs', 5.0000),  -- Egg
  (7006, 5024, 0.5000, 'g', 0.0190),    -- Cornstarch (coating)
  (7006, 5029, 1.0000, 'serving', 1.0000), -- Garnish
  (7006, 5030, 1.0000, 'pcs', 4.0000),  -- Spaghetti Box
  
  -- Honey Mustard Chikin (5pcs chicken)
  (7007, 5001, 5.0000, 'pcs', 36.3635),  -- Chicken: 7.2727 * 5
  (7007, 5027, 15.0000, 'ml', 6.3750),   -- Mustard Paste: 0.425 * 15
  (7007, 5012, 30.0000, 'g', 6.0330),   -- Mayo: 0.2011 * 30
  (7007, 5003, 15.0000, 'ml', 2.5995),   -- Honey: 0.1733 * 15
  (7007, 5013, 1.5000, 'g', 0.0375),    -- Salt: 0.025 * 1.5
  (7007, 5021, 1.5000, 'g', 0.4500),    -- Pepper: 0.3 * 1.5
  (7007, 5031, 15.0000, 'ml', 0.0000),   -- Water
  (7007, 5028, 1.0000, 'pcs', 5.0000),  -- Egg
  (7007, 5024, 0.5000, 'g', 0.0190),    -- Cornstarch (coating)
  (7007, 5029, 1.0000, 'serving', 1.0000), -- Garnish
  (7007, 5030, 1.0000, 'pcs', 4.0000),  -- Spaghetti Box
  
  -- Salted Egg (5pcs chicken)
  (7008, 5001, 5.0000, 'pcs', 36.3635),  -- Chicken: 7.2727 * 5
  (7008, 5010, 30.0000, 'g', 7.7700),    -- Milk Powder: 0.259 * 30
  (7008, 5026, 30.0000, 'g', 20.0700),   -- Salted Egg Powder: 0.669 * 30
  (7008, 5017, 15.0000, 'g', 2.8335),    -- Powdered Sugar: 0.1889 * 15
  (7008, 5008, 20.0000, 'g', 4.0000),   -- Butter: 0.2 * 20
  (7008, 5016, 5.0000, 'g', 0.2500),    -- Sugar: 0.05 * 5
  (7008, 5021, 3.0000, 'g', 0.9000),    -- Pepper: 0.3 * 3
  (7008, 5028, 1.0000, 'pcs', 5.0000),  -- Egg
  (7008, 5024, 0.5000, 'g', 0.0190),    -- Cornstarch (coating)
  (7008, 5029, 1.0000, 'serving', 1.0000), -- Garnish
  (7008, 5030, 1.0000, 'pcs', 4.0000),  -- Spaghetti Box
  
  -- Olenji Chikin (5pcs chicken) - Similar to Boombayah
  (7009, 5001, 5.0000, 'pcs', 36.3635),  -- Chicken: 7.2727 * 5
  (7009, 5015, 15.0000, 'g', 0.9000),    -- Brown Sugar: 0.06 * 15
  (7009, 5004, 20.0000, 'ml', 4.6060),   -- Hot Sauce: 0.2303 * 20
  (7009, 5005, 30.0000, 'ml', 2.4390),   -- Ketchup: 0.0813 * 30
  (7009, 5002, 15.0000, 'ml', 0.5250),   -- Soy Sauce: 0.035 * 15
  (7009, 5028, 1.0000, 'pcs', 5.0000),  -- Egg
  (7009, 5024, 0.5000, 'g', 0.0190),    -- Cornstarch (coating)
  (7009, 5029, 1.0000, 'serving', 1.0000), -- Garnish
  (7009, 5030, 1.0000, 'pcs', 4.0000),  -- Spaghetti Box
  
  -- Yangneom Nom (5pcs chicken) - Similar to Oppa BB-Q
  (7010, 5001, 5.0000, 'pcs', 36.3635),  -- Chicken: 7.2727 * 5
  (7010, 5002, 15.0000, 'ml', 0.5250),   -- Soy Sauce: 0.035 * 15
  (7010, 5006, 5.0000, 'g', 2.0880),    -- Gochujang: 0.4176 * 5
  (7010, 5007, 30.0000, 'ml', 2.0700),   -- Milk: 0.069 * 30
  (7010, 5009, 25.0000, 'g', 4.5500),    -- Cheese: 0.182 * 25
  (7010, 5031, 45.0000, 'ml', 0.0000),   -- Water
  (7010, 5024, 5.0000, 'g', 0.1900),    -- Cornstarch: 0.038 * 5
  (7010, 5028, 1.0000, 'pcs', 5.0000),  -- Egg
  (7010, 5024, 0.5000, 'g', 0.0190),    -- Cornstarch (coating)
  (7010, 5029, 1.0000, 'serving', 1.0000), -- Garnish
  (7010, 5030, 1.0000, 'pcs', 4.0000),  -- Spaghetti Box
  
  -- Bonbon Buldak (5pcs chicken) - Similar to Honey Mustard
  (7011, 5001, 5.0000, 'pcs', 36.3635),  -- Chicken: 7.2727 * 5
  (7011, 5004, 25.0000, 'ml', 5.7575),   -- Hot Sauce: 0.2303 * 25
  (7011, 5003, 20.0000, 'ml', 3.4660),   -- Honey: 0.1733 * 20
  (7011, 5002, 10.0000, 'ml', 0.3500),   -- Soy Sauce: 0.035 * 10
  (7011, 5006, 10.0000, 'g', 4.1760),    -- Gochujang: 0.4176 * 10
  (7011, 5013, 1.0000, 'g', 0.0250),    -- Salt: 0.025 * 1
  (7011, 5028, 1.0000, 'pcs', 5.0000),  -- Egg
  (7011, 5024, 0.5000, 'g', 0.0190),    -- Cornstarch (coating)
  (7011, 5029, 1.0000, 'serving', 1.0000), -- Garnish
  (7011, 5030, 1.0000, 'pcs', 4.0000);  -- Spaghetti Box

INSERT INTO `recipes`
  (`recipe_id`, `product_id`, `recipe_name`, `serving_size`, `total_cost`, `labor_cost`, `packaging_cost`, `total_recipe_cost`, `notes`)
VALUES
  (7101, 2001, 'Classic Milk Tea Recipe', '16oz', 18.00, 0.00, 0.00, 18.00, 'Classic blend with pearls'),
  (7102, 2002, 'Wintermelon Milk Tea Recipe', '16oz', 20.00, 0.00, 0.00, 20.00, 'Wintermelon syrup base'),
  (7103, 2003, 'Okinawa Milk Tea Recipe', '16oz', 20.00, 0.00, 0.00, 20.00, 'Brown sugar syrup base'),
  (7104, 2004, 'Cookies & Cream Milk Tea Recipe', '16oz', 28.00, 0.00, 0.00, 28.00, 'Cookie crumble & chocolate'),
  (7105, 2005, 'Matcha Milk Tea Recipe', '16oz', 26.00, 0.00, 0.00, 26.00, 'Matcha latte base'),
  (7106, 2006, 'Taro Milk Tea Recipe', '16oz', 25.00, 0.00, 0.00, 25.00, 'Taro creamy base'),
  (7107, 2007, 'Strawberry Milk Tea Recipe', '16oz', 24.00, 0.00, 0.00, 24.00, 'Strawberry syrup base'),
  (7108, 2008, 'Chocolate Milk Tea Recipe', '16oz', 24.00, 0.00, 0.00, 24.00, 'Chocolate syrup base'),
  (7109, 2009, 'Brown Sugar Milk Tea Recipe', '16oz', 32.00, 0.00, 0.00, 32.00, 'Brown sugar swirl');

INSERT INTO `recipe_items`
  (`recipe_id`, `ingredient_id`, `quantity`, `unit`, `cost_per_serving`)
VALUES
  (7101, 5034, 50.0000, 'ml', 5.0000),
  (7101, 5035, 30.0000, 'ml', 6.0000),
  (7101, 5036, 8.0000, 'g', 2.0000),
  (7101, 5043, 17.0000, 'g', 2.7200),
  (7101, 5031, 200.0000, 'ml', 0.0000),
  (7101, 5044, 1.0000, 'pcs', 1.3000),
  (7101, 5045, 1.0000, 'pcs', 0.3000),
  (7101, 5046, 1.0000, 'pcs', 0.2500),
  (7101, 5047, 1.0000, 'pcs', 0.2000),
  (7101, 5048, 1.0000, 'pcs', 0.1000),

  (7102, 5034, 40.0000, 'ml', 4.0000),
  (7102, 5037, 40.0000, 'ml', 7.2000),
  (7102, 5036, 8.0000, 'g', 2.0000),
  (7102, 5043, 15.0000, 'g', 2.4000),
  (7102, 5031, 200.0000, 'ml', 0.0000),
  (7102, 5044, 1.0000, 'pcs', 1.3000),
  (7102, 5045, 1.0000, 'pcs', 0.3000),
  (7102, 5046, 1.0000, 'pcs', 0.2500),
  (7102, 5047, 1.0000, 'pcs', 0.2000),
  (7102, 5048, 1.0000, 'pcs', 0.1000),

  (7103, 5034, 40.0000, 'ml', 4.0000),
  (7103, 5038, 40.0000, 'ml', 6.0000),
  (7103, 5036, 8.0000, 'g', 2.0000),
  (7103, 5043, 15.0000, 'g', 2.4000),
  (7103, 5031, 200.0000, 'ml', 0.0000),
  (7103, 5044, 1.0000, 'pcs', 1.3000),
  (7103, 5045, 1.0000, 'pcs', 0.3000),
  (7103, 5046, 1.0000, 'pcs', 0.2500),
  (7103, 5047, 1.0000, 'pcs', 0.2000),
  (7103, 5048, 1.0000, 'pcs', 0.1000),

  (7104, 5034, 40.0000, 'ml', 4.0000),
  (7104, 5041, 50.0000, 'ml', 11.0000),
  (7104, 5036, 10.0000, 'g', 2.5000),
  (7104, 5043, 20.0000, 'g', 3.2000),
  (7104, 5031, 200.0000, 'ml', 0.0000),
  (7104, 5044, 1.0000, 'pcs', 1.3000),
  (7104, 5045, 1.0000, 'pcs', 0.3000),
  (7104, 5046, 1.0000, 'pcs', 0.2500),
  (7104, 5047, 1.0000, 'pcs', 0.2000),
  (7104, 5048, 1.0000, 'pcs', 0.1000),

  (7105, 5039, 15.0000, 'g', 16.5000),
  (7105, 5036, 5.0000, 'g', 1.2500),
  (7105, 5031, 200.0000, 'ml', 0.0000),
  (7105, 5044, 1.0000, 'pcs', 1.3000),
  (7105, 5045, 1.0000, 'pcs', 0.3000),
  (7105, 5046, 1.0000, 'pcs', 0.2500),
  (7105, 5047, 1.0000, 'pcs', 0.2000),
  (7105, 5048, 1.0000, 'pcs', 0.1000),

  (7106, 5040, 15.0000, 'g', 12.0000),
  (7106, 5036, 5.0000, 'g', 1.2500),
  (7106, 5031, 200.0000, 'ml', 0.0000),
  (7106, 5044, 1.0000, 'pcs', 1.3000),
  (7106, 5045, 1.0000, 'pcs', 0.3000),
  (7106, 5046, 1.0000, 'pcs', 0.2500),
  (7106, 5047, 1.0000, 'pcs', 0.2000),
  (7106, 5048, 1.0000, 'pcs', 0.1000),

  (7107, 5034, 30.0000, 'ml', 3.0000),
  (7107, 5042, 40.0000, 'ml', 9.6000),
  (7107, 5036, 6.0000, 'g', 1.5000),
  (7107, 5031, 200.0000, 'ml', 0.0000),
  (7107, 5044, 1.0000, 'pcs', 1.3000),
  (7107, 5045, 1.0000, 'pcs', 0.3000),
  (7107, 5046, 1.0000, 'pcs', 0.2500),
  (7107, 5047, 1.0000, 'pcs', 0.2000),
  (7107, 5048, 1.0000, 'pcs', 0.1000),

  (7108, 5034, 30.0000, 'ml', 3.0000),
  (7108, 5041, 40.0000, 'ml', 8.8000),
  (7108, 5036, 6.0000, 'g', 1.5000),
  (7108, 5031, 200.0000, 'ml', 0.0000),
  (7108, 5044, 1.0000, 'pcs', 1.3000),
  (7108, 5045, 1.0000, 'pcs', 0.3000),
  (7108, 5046, 1.0000, 'pcs', 0.2500),
  (7108, 5047, 1.0000, 'pcs', 0.2000),
  (7108, 5048, 1.0000, 'pcs', 0.1000),

  (7109, 5034, 30.0000, 'ml', 3.0000),
  (7109, 5038, 60.0000, 'ml', 9.0000),
  (7109, 5036, 6.0000, 'g', 1.5000),
  (7109, 5043, 20.0000, 'g', 3.2000),
  (7109, 5031, 200.0000, 'ml', 0.0000),
  (7109, 5044, 1.0000, 'pcs', 1.3000),
  (7109, 5045, 1.0000, 'pcs', 0.3000),
  (7109, 5046, 1.0000, 'pcs', 0.2500),
  (7109, 5047, 1.0000, 'pcs', 0.2000),
  (7109, 5048, 1.0000, 'pcs', 0.1000);

-- Production batch recipes
INSERT INTO `recipes`
  (`recipe_id`, `product_id`, `recipe_name`, `serving_size`, `total_cost`, `labor_cost`, `packaging_cost`, `total_recipe_cost`, `notes`)
VALUES
  (7201, 2010, 'Brewed Assam Black Tea Batch', 'batch', 0.00, 0.00, 0.00, 0.00, 'yield_ml=1000;portion_ml=200'),
  (7202, 2011, 'Simple Syrup Batch', 'batch', 0.00, 0.00, 0.00, 0.00, 'yield_ml=960;portion_ml=10'),
  (7203, 2012, 'Milk Syrup Batch', 'batch', 0.00, 0.00, 0.00, 0.00, 'yield_ml=670;portion_ml=20'),
  (7204, 2013, 'Brown Sugar Sauce Batch', 'batch', 0.00, 0.00, 0.00, 0.00, 'yield_ml=1200;portion_ml=20'),
  (7205, 2014, 'Brown Sugar Syrup Batch', 'batch', 0.00, 0.00, 0.00, 0.00, 'yield_ml=720;portion_ml=45'),
  (7206, 2015, 'Tapioca Pearls Batch', 'batch', 0.00, 0.00, 0.00, 0.00, 'yield_g=340;portion_g=30'),
  (7207, 2016, 'Coffee Jelly Batch', 'batch', 0.00, 0.00, 0.00, 0.00, 'yield_ml=400;portion_ml=30'),
  (7208, 2017, 'Egg Pudding Batch', 'batch', 0.00, 0.00, 0.00, 0.00, 'yield_g=600;portion_g=20'),
  (7209, 2018, 'Cream Puff Batch', 'batch', 0.00, 0.00, 0.00, 0.00, 'yield_ml=200;portion_ml=30'),
  (7210, 2019, 'Cream Cheese Batch', 'batch', 0.00, 0.00, 0.00, 0.00, 'yield_g=150;portion_g=30'),
  (7211, 2020, 'Rock Salt and Cheese Batch', 'batch', 0.00, 0.00, 0.00, 0.00, 'yield_ml=200;portion_ml=30');

INSERT INTO `recipe_items`
  (`recipe_id`, `ingredient_id`, `quantity`, `unit`, `cost_per_serving`)
VALUES
  (7201, 5049, 20.0000, 'g', 0.0000),
  (7201, 5031, 1000.0000, 'ml', 0.0000),

  (7202, 5050, 1000.0000, 'g', 0.0000),
  (7202, 5031, 500.0000, 'ml', 0.0000),

  (7203, 5051, 485.0000, 'ml', 0.0000),
  (7203, 5052, 185.0000, 'ml', 0.0000),

  (7204, 5017, 1000.0000, 'g', 0.0000),
  (7204, 5031, 500.0000, 'ml', 0.0000),

  (7205, 5053, 500.0000, 'g', 0.0000),
  (7205, 5031, 250.0000, 'ml', 0.0000),

  (7206, 5058, 340.0000, 'g', 0.0000),
  (7206, 5031, 3000.0000, 'ml', 0.0000),
  (7206, 5038, 100.0000, 'ml', 0.0000),

  (7207, 5054, 25.0000, 'g', 0.0000),
  (7207, 5050, 45.0000, 'g', 0.0000),
  (7207, 5055, 10.0000, 'g', 0.0000),
  (7207, 5031, 350.0000, 'ml', 0.0000),

  (7208, 5056, 100.0000, 'g', 0.0000),
  (7208, 5031, 500.0000, 'ml', 0.0000),
  (7208, 5035, 45.0000, 'ml', 0.0000),

  (7209, 5057, 50.0000, 'g', 0.0000),
  (7209, 5035, 15.0000, 'ml', 0.0000),
  (7209, 5031, 130.0000, 'ml', 0.0000),

  (7210, 5057, 75.0000, 'g', 0.0000),
  (7210, 5013, 1.0000, 'g', 0.0000),
  (7210, 5031, 75.0000, 'ml', 0.0000),

  (7211, 5057, 38.0000, 'g', 0.0000),
  (7211, 5013, 1.0000, 'g', 0.0000),
  (7211, 5052, 75.0000, 'ml', 0.0000),
  (7211, 5031, 75.0000, 'ml', 0.0000);

-- Initial ingredient stock movements
INSERT INTO `ingredient_movements`
  (`ingredient_id`, `movement_type`, `quantity_change`, `balance_after`, `reference_note`, `created_by`, `created_at`)
VALUES
  (5001, 'stock-in', 500.0000, 500.0000, 'Initial chicken inventory', 1, '2024-11-20 08:00:00'),
  (5002, 'stock-in', 5000.0000, 5000.0000, 'Initial soy sauce inventory', 1, '2024-11-20 08:00:00'),
  (5003, 'stock-in', 3000.0000, 3000.0000, 'Initial honey inventory', 1, '2024-11-20 08:00:00'),
  (5004, 'stock-in', 500.0000, 500.0000, 'Initial hot sauce inventory', 1, '2024-11-20 08:00:00'),
  (5005, 'stock-in', 1000.0000, 1000.0000, 'Initial ketchup inventory', 1, '2024-11-20 08:00:00'),
  (5006, 'stock-in', 500.0000, 500.0000, 'Initial gochujang inventory', 1, '2024-11-20 08:00:00'),
  (5007, 'stock-in', 2000.0000, 2000.0000, 'Initial milk inventory', 1, '2024-11-20 08:00:00'),
  (5008, 'stock-in', 1000.0000, 1000.0000, 'Initial butter inventory', 1, '2024-11-20 08:00:00'),
  (5009, 'stock-in', 2000.0000, 2000.0000, 'Initial cheese inventory', 1, '2024-11-20 08:00:00'),
  (5010, 'stock-in', 2000.0000, 2000.0000, 'Initial milk powder inventory', 1, '2024-11-20 08:00:00'),
  (5011, 'stock-in', 500.0000, 500.0000, 'Initial cheese powder inventory', 1, '2024-11-20 08:00:00'),
  (5012, 'stock-in', 3000.0000, 3000.0000, 'Initial mayo inventory', 1, '2024-11-20 08:00:00'),
  (5013, 'stock-in', 2000.0000, 2000.0000, 'Initial salt inventory', 1, '2024-11-20 08:00:00'),
  (5014, 'stock-in', 1000.0000, 1000.0000, 'Initial garlic inventory', 1, '2024-11-20 08:00:00'),
  (5015, 'stock-in', 2000.0000, 2000.0000, 'Initial brown sugar inventory', 1, '2024-11-20 08:00:00'),
  (5016, 'stock-in', 2000.0000, 2000.0000, 'Initial sugar inventory', 1, '2024-11-20 08:00:00'),
  (5017, 'stock-in', 1000.0000, 1000.0000, 'Initial powdered sugar inventory', 1, '2024-11-20 08:00:00'),
  (5018, 'stock-in', 500.0000, 500.0000, 'Initial garlic powder inventory', 1, '2024-11-20 08:00:00'),
  (5019, 'stock-in', 500.0000, 500.0000, 'Initial onion powder inventory', 1, '2024-11-20 08:00:00'),
  (5020, 'stock-in', 200.0000, 200.0000, 'Initial chili flakes inventory', 1, '2024-11-20 08:00:00'),
  (5021, 'stock-in', 200.0000, 200.0000, 'Initial pepper inventory', 1, '2024-11-20 08:00:00'),
  (5022, 'stock-in', 200.0000, 200.0000, 'Initial parsley inventory', 1, '2024-11-20 08:00:00'),
  (5023, 'stock-in', 200.0000, 200.0000, 'Initial onion springs inventory', 1, '2024-11-20 08:00:00'),
  (5024, 'stock-in', 2000.0000, 2000.0000, 'Initial cornstarch inventory', 1, '2024-11-20 08:00:00'),
  (5025, 'stock-in', 2000.0000, 2000.0000, 'Initial flour inventory', 1, '2024-11-20 08:00:00'),
  (5026, 'stock-in', 500.0000, 500.0000, 'Initial salted egg powder inventory', 1, '2024-11-20 08:00:00'),
  (5027, 'stock-in', 500.0000, 500.0000, 'Initial mustard paste inventory', 1, '2024-11-20 08:00:00'),
  (5028, 'stock-in', 200.0000, 200.0000, 'Initial egg inventory', 1, '2024-11-20 08:00:00'),
  (5029, 'stock-in', 1000.0000, 1000.0000, 'Initial garnish inventory', 1, '2024-11-20 08:00:00'),
  (5030, 'stock-in', 1000.0000, 1000.0000, 'Initial spaghetti box inventory', 1, '2024-11-20 08:00:00'),
  (5031, 'stock-in', 10000.0000, 10000.0000, 'Initial water inventory', 1, '2024-11-20 08:00:00');

INSERT INTO `ingredient_movements`
  (`ingredient_id`, `movement_type`, `quantity_change`, `balance_after`, `reference_note`, `created_by`, `created_at`)
VALUES
  (5034, 'stock-in', 5000.0000, 5000.0000, 'Initial black tea inventory', 1, '2024-11-21 09:00:00'),
  (5035, 'stock-in', 2000.0000, 2000.0000, 'Initial milk syrup inventory', 1, '2024-11-21 09:00:00'),
  (5036, 'stock-in', 2000.0000, 2000.0000, 'Initial non-dairy creamer inventory', 1, '2024-11-21 09:00:00'),
  (5037, 'stock-in', 2000.0000, 2000.0000, 'Initial wintermelon syrup inventory', 1, '2024-11-21 09:00:00'),
  (5038, 'stock-in', 2000.0000, 2000.0000, 'Initial brown sugar syrup inventory', 1, '2024-11-21 09:00:00'),
  (5039, 'stock-in', 1000.0000, 1000.0000, 'Initial matcha powder inventory', 1, '2024-11-21 09:00:00'),
  (5040, 'stock-in', 1000.0000, 1000.0000, 'Initial taro powder inventory', 1, '2024-11-21 09:00:00'),
  (5041, 'stock-in', 2000.0000, 2000.0000, 'Initial chocolate syrup inventory', 1, '2024-11-21 09:00:00'),
  (5042, 'stock-in', 2000.0000, 2000.0000, 'Initial strawberry syrup inventory', 1, '2024-11-21 09:00:00'),
  (5043, 'stock-in', 2000.0000, 2000.0000, 'Initial pearls inventory', 1, '2024-11-21 09:00:00'),
  (5044, 'stock-in', 100.0000, 100.0000, 'Initial 16oz cup inventory', 1, '2024-11-21 09:00:00'),
  (5045, 'stock-in', 100.0000, 100.0000, 'Initial straw inventory', 1, '2024-11-21 09:00:00'),
  (5046, 'stock-in', 100.0000, 100.0000, 'Initial lid inventory', 1, '2024-11-21 09:00:00'),
  (5047, 'stock-in', 100.0000, 100.0000, 'Initial sticker inventory', 1, '2024-11-21 09:00:00'),
  (5048, 'stock-in', 100.0000, 100.0000, 'Initial plastic inventory', 1, '2024-11-21 09:00:00');

INSERT INTO `ingredient_movements`
  (`ingredient_id`, `movement_type`, `quantity_change`, `balance_after`, `reference_note`, `created_by`, `created_at`)
VALUES
  (5049, 'stock-in', 500.0000, 500.0000, 'Initial Assam loose tea', 1, '2024-11-21 09:10:00'),
  (5050, 'stock-in', 2000.0000, 2000.0000, 'Initial white sugar', 1, '2024-11-21 09:10:00'),
  (5051, 'stock-in', 500.0000, 500.0000, 'Initial condensed milk', 1, '2024-11-21 09:10:00'),
  (5052, 'stock-in', 500.0000, 500.0000, 'Initial evaporated milk', 1, '2024-11-21 09:10:00'),
  (5053, 'stock-in', 1000.0000, 1000.0000, 'Initial muscovado', 1, '2024-11-21 09:10:00'),
  (5054, 'stock-in', 200.0000, 200.0000, 'Initial nescafe coffee', 1, '2024-11-21 09:10:00'),
  (5055, 'stock-in', 200.0000, 200.0000, 'Initial jelly powder', 1, '2024-11-21 09:10:00'),
  (5056, 'stock-in', 500.0000, 500.0000, 'Initial egg pudding powder', 1, '2024-11-21 09:10:00'),
  (5057, 'stock-in', 1000.0000, 1000.0000, 'Initial salted cream cheese', 1, '2024-11-21 09:10:00'),
  (5058, 'stock-in', 2000.0000, 2000.0000, 'Initial tapioca pearls', 1, '2024-11-21 09:10:00');

-- ---------------------------------------------------------------------
--  Usage Notes:
-- ---------------------------------------------------------------------
--  When an order is placed:
--  1. Create order record in `orders` table
--  2. Create order_items for each product ordered
--  3. For each order_item, find the associated recipe in `recipes` table
--  4. For each recipe_item in the recipe, deduct ingredients:
--     - Calculate: quantity_needed = recipe_item.quantity * order_item.quantity
--     - Update: ingredients.current_stock -= quantity_needed
--     - Log: INSERT into ingredient_movements with movement_type='consumption'
--  5. Update product stock if tracking finished products separately
--
--  Example SQL for ingredient deduction on order:
--  ```
--  -- For each order item, deduct recipe ingredients
--  INSERT INTO ingredient_movements 
--    (ingredient_id, order_id, recipe_id, movement_type, quantity_change, balance_after, created_by)
--  SELECT 
--    ri.ingredient_id,
--    @order_id,
--    r.recipe_id,
--    'consumption',
--    -(ri.quantity * @order_quantity) as quantity_change,
--    i.current_stock - (ri.quantity * @order_quantity) as balance_after,
--    @user_id
--  FROM recipes r
--  JOIN recipe_items ri ON r.recipe_id = ri.recipe_id
--  JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
--  WHERE r.product_id = @product_id;
--  
--  UPDATE ingredients i
--  JOIN ingredient_movements im ON i.ingredient_id = im.ingredient_id
--  SET i.current_stock = im.balance_after
--  WHERE im.order_id = @order_id;
--  ```
--
-- ---------------------------------------------------------------------
--  End of file
-- ---------------------------------------------------------------------

