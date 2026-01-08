<?php
// display added products
require_once 'connections.php';

header('Content-Type: application/json; charset=utf-8');

try {
    if (isset($_GET['id'])) {
        $productId = intval($_GET['id']);

        $stmt = $pdo->prepare("SELECT * FROM products WHERE product_id = ?");
        $stmt->execute([$productId]);
        $product = $stmt->fetch();

        if (!$product) {
            http_response_code(404);
            echo json_encode(['error' => 'Product not found']);
            exit;
        }

        $variantsStmt = $pdo->prepare("SELECT * FROM product_variants WHERE product_id = ?");
        $variantsStmt->execute([$productId]);
        $variants = $variantsStmt->fetchAll();

        echo json_encode(['product' => $product, 'variants' => $variants]);
    } else {
        $stmt = $pdo->query("SELECT p.*, c.name as category_name FROM products p LEFT JOIN product_categories c ON p.category_id = c.category_id WHERE p.is_active = 1 ORDER BY p.category_id, p.name");
        $products = $stmt->fetchAll();
        echo json_encode($products);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
