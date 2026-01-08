<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
require_once 'connections.php';

try {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
    } else {
        $data = $_POST;
    }

    $productId = isset($data['productId']) ? intval($data['productId']) : 0;
    if ($productId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'productId is required']);
        exit;
    }

    // Basic fields
    $name = isset($data['name']) ? trim($data['name']) : null;
    $sellingPrice = isset($data['sellingPrice']) ? floatval($data['sellingPrice']) : null;
    $costPrice = isset($data['costPrice']) ? floatval($data['costPrice']) : null;
    $description = isset($data['description']) ? $data['description'] : null;
    $imageData = isset($data['imageData']) ? $data['imageData'] : null;
    $category = isset($data['category']) ? trim($data['category']) : null;
    $updatedBy = isset($data['updatedBy']) ? intval($data['updatedBy']) : 1;

    // Fetch existing product row (before update) for change detection and logging
    $beforeStmt = $pdo->prepare('SELECT p.*, c.slug as category_slug, c.name as category_name FROM products p LEFT JOIN product_categories c ON p.category_id = c.category_id WHERE p.product_id = ? LIMIT 1');
    $beforeStmt->execute([$productId]);
    $beforeRow = $beforeStmt->fetch();

    if (!$beforeRow) {
        http_response_code(404);
        echo json_encode(['error' => 'Product not found']);
        exit;
    }

    // Resolve category id if category provided
    $categoryId = null;
    if (!empty($category)) {
        $normalizedCategory = strtolower(str_replace(' ', '', $category));
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $category), '-'));

        $catStmt = $pdo->prepare('SELECT category_id FROM product_categories WHERE name = ? OR slug = ? OR LOWER(REPLACE(name, " ", "")) = ? LIMIT 1');
        $catStmt->execute([$category, $slug, $normalizedCategory]);
        $catRow = $catStmt->fetch();

        if ($catRow) {
            $categoryId = (int) $catRow['category_id'];
        } else {
            // create new category
            $insCat = $pdo->prepare('INSERT INTO product_categories (slug, name) VALUES (?, ?)');
            if (!$insCat->execute([$slug, $category])) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create category']);
                exit;
            }
            $categoryId = (int) $pdo->lastInsertId();
        }
    }

    // Handle image saving (if provided)
    $imagePath = null;
    if (!empty($imageData) && is_string($imageData)) {
        if (preg_match('#^data:image/[^;]+;base64,#', $imageData)) {
            $imageData = preg_replace('#^data:image/[^;]+;base64,#', '', $imageData);
        }
        $imageData = str_replace(' ', '+', $imageData);
        $decoded = base64_decode($imageData, true);
        if ($decoded !== false && strlen($decoded) > 0) {
            $uploadsDir = __DIR__ . '/../Bonbon Pics';
            if (!is_dir($uploadsDir))
                @mkdir($uploadsDir, 0755, true);
            $filename = 'product_edit_' . time() . '_' . rand(1000, 9999) . '.jpg';
            $filepath = $uploadsDir . '/' . $filename;
            if (@file_put_contents($filepath, $decoded) !== false) {
                $imagePath = 'Bonbon Pics/' . $filename;
            }
        }
    }

    // Build update statement dynamically based on provided fields
    $fields = [];
    $values = [];

    if ($categoryId !== null) {
        $fields[] = 'category_id = ?';
        $values[] = $categoryId;
    }
    if ($name !== null) {
        $fields[] = 'name = ?';
        $values[] = $name;
    }
    if ($sellingPrice !== null) {
        $fields[] = 'selling_price = ?';
        $values[] = $sellingPrice;
    }
    if ($costPrice !== null) {
        $fields[] = 'cost_price = ?';
        $values[] = $costPrice;
    }
    if ($description !== null) {
        $fields[] = 'description = ?';
        $values[] = $description;
    }
    if ($imagePath !== null) {
        $fields[] = 'image_path = ?';
        $values[] = $imagePath;
    }

    if (count($fields) === 0) {
        echo json_encode(['success' => true, 'message' => 'No changes']);
        exit;
    }

    // append updated_by
    $fields[] = 'updated_by = ?';
    $values[] = $updatedBy;

    $sql = 'UPDATE products SET ' . implode(', ', $fields) . ' WHERE product_id = ? LIMIT 1';
    $values[] = $productId;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
    $affected = $stmt->rowCount();

    // Fetch updated product
    $prodStmt = $pdo->prepare("SELECT p.*, c.slug as category_slug, c.name as category_name FROM products p LEFT JOIN product_categories c ON p.category_id = c.category_id WHERE p.product_id = ? LIMIT 1");
    $prodStmt->execute([$productId]);
    $updatedProduct = $prodStmt->fetch();

    // Build change list by comparing before/after rows for key fields
    $changes = [];
    $compareFields = ['name', 'selling_price', 'cost_price', 'description', 'image_path', 'category_id'];
    foreach ($compareFields as $f) {
        $beforeVal = array_key_exists($f, $beforeRow) ? $beforeRow[$f] : null;
        $afterVal = $updatedProduct && array_key_exists($f, $updatedProduct) ? $updatedProduct[$f] : null;
        if (is_null($beforeVal) && is_null($afterVal))
            continue;
        if ((string) $beforeVal !== (string) $afterVal) {
            $changes[] = ['field' => $f, 'before' => $beforeVal, 'after' => $afterVal];
        }
    }

    // Create log entry
    $logEntry = [
        'timestamp' => date('c'),
        'action' => 'edit',
        'product_id' => $productId,
        'user_id' => $updatedBy,
        'changes' => $changes,
        'before' => $beforeRow,
        'after' => $updatedProduct
    ];

    // Append to newline-delimited JSON log file
    $logFile = __DIR__ . '/product_edits.log';
    @file_put_contents($logFile, json_encode($logEntry, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);

    $response = ['success' => true, 'affectedRows' => $affected, 'product' => $updatedProduct];
    if ($imagePath !== null)
        $response['imagePath'] = $imagePath;

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
