<?php
header('Content-Type: application/json');
include 'db_connection.php';

// Get the request method
$method = $_SERVER['REQUEST_METHOD'];

// Handle different request methods
switch($method) {
    case 'GET':
        // Get all products or a specific product
        if (isset($_GET['id'])) {
            getProduct($_GET['id']);
        } else {
            getAllProducts();
        }
        break;
    
    case 'POST':
        // Add new product
        addProduct();
        break;
    
    case 'PUT':
        // Update product
        parse_str(file_get_contents("php://input"), $put_data);
        updateProduct($put_data);
        break;
    
    case 'DELETE':
        // Delete product
        parse_str(file_get_contents("php://input"), $delete_data);
        deleteProduct($delete_data['id']);
        break;
    
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

// Get all products
function getAllProducts() {
    global $conn;
    
    $sql = "SELECT p.product_id, p.client_product_id, p.name, p.selling_price, p.stock_quantity, 
                   p.reorder_level, p.is_active, p.image_path,
                   pc.category_id, pc.name as category_name, pc.slug as category_slug
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.category_id
            WHERE p.is_active = 1
            ORDER BY p.product_id DESC";
    
    $result = $conn->query($sql);
    
    if ($result) {
        $products = [];
        while ($row = $result->fetch_assoc()) {
            $products[] = [
                'id' => $row['client_product_id'] ?: '#' . str_pad($row['product_id'], 4, '0', STR_PAD_LEFT),
                'product_id' => $row['product_id'],
                'name' => $row['name'],
                'category' => $row['category_slug'] ?: 'uncategorized',
                'category_name' => $row['category_name'] ?: 'Uncategorized',
                'price' => floatval($row['selling_price']),
                'stock' => intval($row['stock_quantity']),
                'reorder_level' => intval($row['reorder_level']),
                'status' => calculateProductStatus($row['stock_quantity'], $row['reorder_level']),
                'image_path' => $row['image_path']
            ];
        }
        echo json_encode(['success' => true, 'data' => $products]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $conn->error]);
    }
}

// Get single product
function getProduct($id) {
    global $conn;
    
    $sql = "SELECT p.*, pc.name as category_name, pc.slug as category_slug
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.category_id
            WHERE p.product_id = ? OR p.client_product_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $id, $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'data' => $row]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Product not found']);
    }
}

// Add new product
function addProduct() {
    global $conn;
    
    // Get JSON input
    $data = json_decode(file_get_contents("php://input"), true);
    
    // If JSON decode failed, try form data
    if (!$data) {
        $data = $_POST;
    }
    
    // Validate required fields
    if (empty($data['name']) || empty($data['price']) || !isset($data['stock'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }
    
    // Get or create category
    $category_id = getOrCreateCategory($data['category']);
    
    // Generate client_product_id if not provided
    $client_product_id = !empty($data['productId']) ? $data['productId'] : generateProductId($data['category']);
    
    // Insert product
    $sql = "INSERT INTO products (client_product_id, category_id, name, selling_price, stock_quantity, reorder_level, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)";
    
    $reorder_level = isset($data['reorder_level']) ? intval($data['reorder_level']) : 10;
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sisdii", 
        $client_product_id,
        $category_id,
        $data['name'],
        $data['price'],
        $data['stock'],
        $reorder_level
    );
    
    if ($stmt->execute()) {
        $product_id = $conn->insert_id;
        echo json_encode([
            'success' => true, 
            'message' => 'Product added successfully',
            'product_id' => $product_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to add product: ' . $conn->error]);
    }
}

// Update product
function updateProduct($data) {
    global $conn;
    
    if (empty($data['product_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Product ID required']);
        return;
    }
    
    // Get or create category
    $category_id = getOrCreateCategory($data['category']);
    
    $sql = "UPDATE products 
            SET client_product_id = ?, category_id = ?, name = ?, selling_price = ?, 
                stock_quantity = ?, reorder_level = ?
            WHERE product_id = ?";
    
    $reorder_level = isset($data['reorder_level']) ? intval($data['reorder_level']) : 10;
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sisdiii",
        $data['productId'],
        $category_id,
        $data['name'],
        $data['price'],
        $data['stock'],
        $reorder_level,
        $data['product_id']
    );
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Product updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update product: ' . $conn->error]);
    }
}

// Delete product (soft delete by setting is_active = 0)
function deleteProduct($id) {
    global $conn;
    
    $sql = "UPDATE products SET is_active = 0 WHERE product_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete product: ' . $conn->error]);
    }
}

// Get or create category
function getOrCreateCategory($category_name) {
    global $conn;
    
    if (empty($category_name)) {
        $category_name = 'Uncategorized';
    }
    
    // Create slug from category name
    $slug = strtolower(str_replace(' ', '-', $category_name));
    
    // Check if category exists
    $sql = "SELECT category_id FROM product_categories WHERE slug = ? OR name = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $slug, $category_name);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        return $row['category_id'];
    }
    
    // Create new category
    $sql = "INSERT INTO product_categories (slug, name) VALUES (?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $slug, $category_name);
    $stmt->execute();
    
    return $conn->insert_id;
}

// Generate product ID based on category
function generateProductId($category) {
    global $conn;
    
    // Map category to prefix
    $prefixes = [
        'chicken' => 'CHK',
        'bubbletea' => 'BT',
        'bubble-tea' => 'BT',
        'cups' => 'SUP',
        'supplies' => 'SUP',
        'ingredients' => 'ING',
        'packaging' => 'PKG'
    ];
    
    $category_lower = strtolower($category);
    $prefix = 'PROD'; // Default prefix
    
    foreach ($prefixes as $key => $value) {
        if (strpos($category_lower, $key) !== false) {
            $prefix = $value;
            break;
        }
    }
    
    // Get next number for this prefix
    $sql = "SELECT MAX(CAST(SUBSTRING(client_product_id, 5) AS UNSIGNED)) as max_num 
            FROM products 
            WHERE client_product_id LIKE ?";
    $pattern = $prefix . '-%';
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $pattern);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    $next_num = ($row['max_num'] ?? 0) + 1;
    return $prefix . '-' . str_pad($next_num, 4, '0', STR_PAD_LEFT);
}

// Calculate product status
function calculateProductStatus($stock, $reorder_level) {
    if ($stock <= 0) {
        return 'out-of-stock';
    } elseif ($stock <= $reorder_level) {
        return 'low-stock';
    } else {
        return 'in-stock';
    }
}
?>

