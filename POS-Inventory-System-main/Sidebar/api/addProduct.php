<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'connections.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            // Get single product by ID
            $productId = intval($_GET['id']);

            $stmt = $pdo->prepare("SELECT * FROM products WHERE product_id = ?");
            $stmt->execute([$productId]);
            $product = $stmt->fetch();

            if (!$product) {
                http_response_code(404);
                echo json_encode(['error' => 'Product not found']);
                exit;
            }

            // Get variants
            $variantsStmt = $pdo->prepare("SELECT * FROM product_variants WHERE product_id = ?");
            $variantsStmt->execute([$productId]);
            $variants = $variantsStmt->fetchAll();

            echo json_encode(['product' => $product, 'variants' => $variants]);
        } else {
            // Get all products
            $stmt = $pdo->query("SELECT p.*, c.name as category_name FROM products p LEFT JOIN product_categories c ON p.category_id = c.category_id WHERE p.is_active = 1 ORDER BY p.category_id, p.name");
            $products = $stmt->fetchAll();
            echo json_encode($products);
        }
    } elseif ($method === 'POST') {
        // Add new product (accept JSON or form-data)
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (stripos($contentType, 'application/json') !== false) {
            $data = json_decode(file_get_contents('php://input'), true) ?: [];
        } else {
            $data = $_POST;
        }

        $name = trim($data['name'] ?? '');
        $category = trim($data['category'] ?? ($data['categoryName'] ?? ''));
        $sellingPrice = isset($data['sellingPrice']) ? floatval($data['sellingPrice']) : 0.0;
        $costPrice = isset($data['costPrice']) ? floatval($data['costPrice']) : 0.0;
        $description = $data['description'] ?? '';
        $imageData = $data['imageData'] ?? null;
        $createdBy = isset($data['createdBy']) ? intval($data['createdBy']) : 1;

        if ($name === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Product name is required']);
            exit;
        }

        // Save image if provided
        $imagePath = null;
        if ($imageData) {
            $imageData = str_replace('data:image/jpeg;base64,', '', $imageData);
            $imageData = str_replace(' ', '+', $imageData);
            $decodedImage = base64_decode($imageData, true);

            if ($decodedImage !== false && strlen($decodedImage) > 0) {
                $uploadsDir = __DIR__ . '/../Bonbon Pics';
                if (!is_dir($uploadsDir)) {
                    @mkdir($uploadsDir, 0755, true);
                }

                $filename = 'product_' . time() . '_' . rand(1000, 9999) . '.jpg';
                $filepath = $uploadsDir . '/' . $filename;

                $bytes = @file_put_contents($filepath, $decodedImage);
                if ($bytes !== false) {
                    $imagePath = 'Bonbon Pics/' . $filename;
                } else {
                    error_log("Failed to write image to: " . $filepath);
                }
            } else {
                error_log("Failed to decode base64 image data");
            }
        }

        if ($category === '') {
            $category = 'Uncategorized';
        }

        $normalizedCategory = strtolower(str_replace(' ', '', $category));
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $category), '-'));

        // Resolve category id by name, slug, or normalized match, create if missing
        $catStmt = $pdo->prepare('SELECT category_id FROM product_categories WHERE name = ? OR slug = ? OR LOWER(REPLACE(name, \' \', \'\')) = ? LIMIT 1');
        $catStmt->execute([$category, $slug, $normalizedCategory]);
        $catRow = $catStmt->fetch();

        if ($catRow) {
            $categoryId = (int) $catRow['category_id'];
        } else {
            $insCat = $pdo->prepare('INSERT INTO product_categories (slug, name) VALUES (?, ?)');
            if (!$insCat->execute([$slug, $category])) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create category']);
                exit;
            }
            $categoryId = (int) $pdo->lastInsertId();
        }

        $stmt = $pdo->prepare("INSERT INTO products (category_id, name, selling_price, cost_price, description, unit, stock_quantity, is_active, created_by, image_path) VALUES (?, ?, ?, ?, ?, 'serving', 0, 1, ?, ?)");

        $stmt->execute([$categoryId, $name, $sellingPrice, $costPrice, $description, $createdBy, $imagePath]);
        $productId = (int) $pdo->lastInsertId();

        // Log product creation
        $logFile = __DIR__ . '/product_edits.log';
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'action' => 'add',
            'product_id' => $productId,
            'user_id' => $createdBy,
            'after' => [
                'name' => $name,
                'selling_price' => $sellingPrice,
                'cost_price' => $costPrice,
                'category_id' => $categoryId,
                'description' => $description,
                'image_path' => $imagePath
            ]
        ];
        @file_put_contents($logFile, json_encode($logEntry) . PHP_EOL, FILE_APPEND | LOCK_EX);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'productId' => $productId,
            'createdBy' => $createdBy,
            'categoryId' => $categoryId,
            'name' => $name,
            'sellingPrice' => $sellingPrice,
            'imagePath' => $imagePath
        ]);
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    error_log('Error in addProduct.php: ' . $e->getMessage());
}
