<?php
header('Content-Type: application/json');
include 'db_connection.php';

// Get all categories
$sql = "SELECT category_id, slug, name FROM product_categories ORDER BY name";
$result = $conn->query($sql);

if ($result) {
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        $categories[] = [
            'id' => $row['category_id'],
            'slug' => $row['slug'],
            'name' => $row['name']
        ];
    }
    echo json_encode(['success' => true, 'data' => $categories]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $conn->error]);
}
?>

