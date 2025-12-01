<?php
header('Content-Type: application/json');
include 'db_connection.php';

// Get inventory summary statistics
$sql = "SELECT 
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as products_in_stock,
    COUNT(*) as total_items,
    COUNT(CASE WHEN stock_quantity > 0 AND stock_quantity <= reorder_level THEN 1 END) as low_stock,
    COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock,
    SUM(selling_price * stock_quantity) as total_value
FROM products
WHERE is_active = 1";

$result = $conn->query($sql);

if ($result) {
    $row = $result->fetch_assoc();
    echo json_encode([
        'success' => true,
        'data' => [
            'productsInStock' => intval($row['products_in_stock']),
            'totalItems' => intval($row['total_items']),
            'lowStock' => intval($row['low_stock']),
            'outOfStock' => intval($row['out_of_stock']),
            'totalValue' => floatval($row['total_value'] ?? 0)
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $conn->error]);
}
?>

