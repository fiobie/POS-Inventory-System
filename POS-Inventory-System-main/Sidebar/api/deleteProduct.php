<?php
header('Content-Type: application/json');
require_once 'connections.php';

try {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];

    if (empty($input['productId']) || empty($input['category'])) {
        http_response_code(400);
        echo json_encode(['error' => 'productId and category are required']);
        exit;
    }

    $productId = intval($input['productId']);
    $category = trim($input['category']);

    $catStmt = $pdo->prepare('SELECT category_id FROM product_categories WHERE slug = ?');
    $catStmt->execute([$category]);
    $catRow = $catStmt->fetch();

    if (!$catRow) {
        http_response_code(404);
        echo json_encode(['error' => 'Category not found']);
        exit;
    }

    $categoryId = $catRow['category_id'];

    $stmt = $pdo->prepare('UPDATE products SET is_active = 0 WHERE product_id = ? AND category_id = ?');
    $stmt->execute([$productId, $categoryId]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Product deleted']);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Product not found']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
