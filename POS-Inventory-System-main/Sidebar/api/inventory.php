<?php
/**
 * Inventory API Endpoint
 * Handles: add_product, update_product, delete_product with image upload
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'connections.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'method_not_allowed']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $input['action'] ?? '';

    switch ($action) {
        case 'add_product':
            $name = trim($input['name'] ?? '');
            $category = trim($input['category'] ?? 'uncategorized');
            $price = isset($input['price']) ? floatval($input['price']) : 0;
            $stock = isset($input['stock']) ? intval($input['stock']) : 0;
            $imageData = $input['imageData'] ?? null;

            if ($name === '') {
                http_response_code(400);
                echo json_encode(['error' => 'name_required']);
                exit;
            }

            // Handle image upload
            $imagePath = null;
            if ($imageData) {
                $imagePath = saveBase64Image($imageData, 'product_');
            }

            // Resolve category ID
            $categoryId = resolveCategoryId($pdo, $category);

            // Insert product
            $stmt = $pdo->prepare("
                INSERT INTO products (name, category_id, selling_price, stock_quantity, image_path, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, 1, NOW())
            ");
            $stmt->execute([$name, $categoryId, $price, $stock, $imagePath]);

            $productId = $pdo->lastInsertId();

            // Log the action
            logProductChange($pdo, $productId, 'add', null, $name, null, $price);

            echo json_encode([
                'success' => true,
                'product_id' => $productId,
                'image_path' => $imagePath
            ]);
            break;

        case 'update_product':
            $productId = isset($input['productId']) ? intval($input['productId']) : 0;
            $name = isset($input['name']) ? trim($input['name']) : null;
            $category = isset($input['category']) ? trim($input['category']) : null;
            $price = isset($input['price']) ? floatval($input['price']) : null;
            $stock = isset($input['stock']) ? intval($input['stock']) : null;
            $imageData = $input['imageData'] ?? null;

            // If no productId, try to find by name
            if ($productId <= 0 && $name) {
                $findStmt = $pdo->prepare("SELECT product_id, name, selling_price FROM products WHERE name = ? LIMIT 1");
                $findStmt->execute([$name]);
                $found = $findStmt->fetch();
                if ($found) {
                    $productId = $found['product_id'];
                }
            }

            if ($productId <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'product_not_found']);
                exit;
            }

            // Get existing product for logging
            $beforeStmt = $pdo->prepare("SELECT name, selling_price FROM products WHERE product_id = ?");
            $beforeStmt->execute([$productId]);
            $before = $beforeStmt->fetch();

            // Handle image upload
            $imagePath = null;
            if ($imageData) {
                $imagePath = saveBase64Image($imageData, 'product_edit_');
            }

            // Build update query dynamically
            $fields = [];
            $values = [];

            if ($name !== null) {
                $fields[] = 'name = ?';
                $values[] = $name;
            }
            if ($category !== null) {
                $categoryId = resolveCategoryId($pdo, $category);
                $fields[] = 'category_id = ?';
                $values[] = $categoryId;
            }
            if ($price !== null) {
                $fields[] = 'selling_price = ?';
                $values[] = $price;
            }
            if ($stock !== null) {
                $fields[] = 'stock_quantity = ?';
                $values[] = $stock;
            }
            if ($imagePath !== null) {
                $fields[] = 'image_path = ?';
                $values[] = $imagePath;
            }

            if (empty($fields)) {
                echo json_encode(['success' => true, 'message' => 'no_changes']);
                exit;
            }

            $fields[] = 'updated_at = NOW()';
            $values[] = $productId;

            $sql = "UPDATE products SET " . implode(', ', $fields) . " WHERE product_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);

            // Log the change
            logProductChange($pdo, $productId, 'edit', $before['name'] ?? null, $name, $before['selling_price'] ?? null, $price);

            echo json_encode([
                'success' => true,
                'product_id' => $productId,
                'image_path' => $imagePath
            ]);
            break;

        case 'delete_product':
            $productId = isset($input['productId']) ? intval($input['productId']) : 0;
            $name = isset($input['name']) ? trim($input['name']) : null;

            // If no productId, try to find by name
            if ($productId <= 0 && $name) {
                $findStmt = $pdo->prepare("SELECT product_id FROM products WHERE name = ? LIMIT 1");
                $findStmt->execute([$name]);
                $found = $findStmt->fetch();
                if ($found) {
                    $productId = $found['product_id'];
                }
            }

            if ($productId <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'product_not_found']);
                exit;
            }

            // Soft delete (mark as inactive)
            $stmt = $pdo->prepare("UPDATE products SET is_active = 0, updated_at = NOW() WHERE product_id = ?");
            $stmt->execute([$productId]);

            // Log the action
            logProductChange($pdo, $productId, 'delete', $name, null, null, null);

            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'unknown_action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    error_log('Error in inventory.php: ' . $e->getMessage());
    echo json_encode(['error' => 'db_error']);
}

/**
 * Save base64 image data to file
 */
function saveBase64Image($imageData, $prefix = 'product_')
{
    // Remove data URI prefix if present
    if (preg_match('#^data:image/[^;]+;base64,#', $imageData)) {
        $imageData = preg_replace('#^data:image/[^;]+;base64,#', '', $imageData);
    }
    $imageData = str_replace(' ', '+', $imageData);
    $decoded = base64_decode($imageData, true);

    if ($decoded === false || strlen($decoded) === 0) {
        return null;
    }

    $uploadsDir = __DIR__ . '/../Bonbon Pics';
    if (!is_dir($uploadsDir)) {
        @mkdir($uploadsDir, 0755, true);
    }

    $filename = $prefix . time() . '_' . rand(1000, 9999) . '.jpg';
    $filepath = $uploadsDir . '/' . $filename;

    if (@file_put_contents($filepath, $decoded) !== false) {
        return 'Bonbon Pics/' . $filename;
    }

    return null;
}

/**
 * Resolve category name to ID, create if doesn't exist
 */
function resolveCategoryId($pdo, $categoryName)
{
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $categoryName), '-'));
    $normalized = strtolower(str_replace(' ', '', $categoryName));

    $stmt = $pdo->prepare("
        SELECT category_id FROM product_categories 
        WHERE name = ? OR slug = ? OR LOWER(REPLACE(name, ' ', '')) = ? 
        LIMIT 1
    ");
    $stmt->execute([$categoryName, $slug, $normalized]);
    $row = $stmt->fetch();

    if ($row) {
        return (int) $row['category_id'];
    }

    // Create new category
    $insertStmt = $pdo->prepare("INSERT INTO product_categories (slug, name) VALUES (?, ?)");
    $insertStmt->execute([$slug, $categoryName]);
    return (int) $pdo->lastInsertId();
}

/**
 * Log product changes for audit trail
 */
function logProductChange($pdo, $productId, $action, $nameBefore, $nameAfter, $priceBefore, $priceAfter)
{
    try {
        $stmt = $pdo->prepare("
            INSERT INTO product_logs (product_id, action, name_before, name_after, price_before, price_after, user_id, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
        ");
        $stmt->execute([$productId, $action, $nameBefore, $nameAfter, $priceBefore, $priceAfter]);
    } catch (Exception $e) {
        // Log table might not exist, silently fail
        error_log('Could not log product change: ' . $e->getMessage());
    }
}
