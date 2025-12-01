<?php
include 'db_connection.php';

// Function to populate products table with initial data
function populateProducts() {
    global $conn;
    
    // First, ensure categories exist
    $categories = [
        ['id' => 1, 'slug' => 'chicken', 'name' => 'Chicken Flavors', 'description' => 'Signature double-fried Korean chicken flavors.', 'threshold' => 15],
        ['id' => 2, 'slug' => 'bubbletea', 'name' => 'Bubble Tea Flavors', 'description' => 'Milk tea line with customizable sizes.', 'threshold' => 20],
        ['id' => 3, 'slug' => 'cups', 'name' => 'Cups & Packaging', 'description' => 'Packaging supplies and disposables.', 'threshold' => 200]
    ];
    
    // Insert categories if they don't exist
    foreach ($categories as $cat) {
        $check = $conn->query("SELECT category_id FROM product_categories WHERE category_id = {$cat['id']}");
        if ($check->num_rows == 0) {
            $sql = "INSERT INTO product_categories (category_id, slug, name, description, low_stock_threshold) 
                    VALUES ({$cat['id']}, '{$cat['slug']}', '{$cat['name']}', '{$cat['description']}', {$cat['threshold']})";
            $conn->query($sql);
        }
    }
    
    // Sample products data
    $products = [
        // Chicken Flavors (category_id = 1)
        ['CHK-0001', 1, 'Cloy Honey Soy', 'Sticky soy garlic glaze with toasted sesame.', 'serving', 'CHK-0001', 43.75, 149.00, 48, 15, 'Bonbon Pics/cloy honey soy.jpg'],
        ['CHK-0002', 1, 'Boombayah', 'Sweet & spicy gochujang glaze.', 'serving', 'CHK-0002', 45.50, 149.00, 32, 15, 'Bonbon Pics/boombayah.jpg'],
        ['CHK-0003', 1, 'Honey Butter Night', 'Rich honey butter sauce with herbs.', 'serving', 'CHK-0003', 44.80, 149.00, 25, 15, 'Bonbon Pics/honey butter night.jpg'],
        ['CHK-0004', 1, 'Oppa BB-Q', 'Korean barbecue glaze with roasted garlic.', 'serving', 'CHK-0004', 49.50, 149.00, 30, 15, 'Bonbon Pics/Oppa BB-Q.jpg'],
        ['CHK-0005', 1, 'Chijeu Chikin', 'Cheesy glaze finished with torched mozzarella.', 'serving', 'CHK-0005', 45.58, 149.00, 26, 15, 'Bonbon Pics/Chijeu Chikin.jpg'],
        ['CHK-0006', 1, 'Olenji Chikin', 'Orange zest glaze with chili crunch.', 'serving', 'CHK-0006', 45.50, 149.00, 18, 12, 'Bonbon Pics/Olenji Chikin.jpg'],
        ['CHK-0007', 1, 'Salted Egg Chikin', 'Creamy salted-egg sauce with curry leaves.', 'serving', 'CHK-0007', 73.80, 159.00, 20, 12, 'Bonbon Pics/Salted Egg Chikin.jpg'],
        ['CHK-0008', 1, 'Yangneom Nom', 'Sweet, sticky, mildly spicy glaze.', 'serving', 'CHK-0008', 49.50, 159.00, 22, 12, 'Bonbon Pics/Yangneom Nom.jpg'],
        ['CHK-0009', 1, 'Bonbon Buldak', 'Extra spicy fire chicken.', 'serving', 'CHK-0009', 48.00, 159.00, 18, 12, 'Bonbon Pics/Bonbon Buldak.jpg'],
        ['CHK-0010', 1, 'Snow Cheese', 'Creamy cheese powder with parmesan.', 'serving', 'CHK-0010', 52.00, 159.00, 25, 12, 'Bonbon Pics/snow cheese.jpg'],
        ['CHK-0011', 1, 'Honey Mustard Chikin', 'Tangy honey mustard glaze.', 'serving', 'CHK-0011', 46.00, 149.00, 20, 12, 'Bonbon Pics/Honey Mustard Chikin.jpg'],
        
        // Bubble Tea Flavors (category_id = 2)
        ['BT-0001', 2, 'Classic Milk Tea', 'Original black tea with creamy finish.', 'drink', 'BT-0001', 18.00, 45.00, 58, 25, 'Bonbon Pics/Milktea3.jpg'],
        ['BT-0002', 2, 'Wintermelon Milk Tea', 'Caramelized wintermelon syrup & pearls.', 'drink', 'BT-0002', 20.00, 50.00, 55, 25, 'Bonbon Pics/Milktea3.jpg'],
        ['BT-0003', 2, 'Okinawa Milk Tea', 'Roasted brown sugar & creamy finish.', 'drink', 'BT-0003', 20.00, 50.00, 52, 25, 'Bonbon Pics/Milktea3.jpg'],
        ['BT-0004', 2, 'Cookies & Cream Milk Tea', 'Cookie crumble & whipped foam.', 'drink', 'BT-0004', 28.00, 60.00, 43, 20, 'Bonbon Pics/Milktea1.jpg'],
        ['BT-0005', 2, 'Matcha Milk Tea', 'Ceremonial-grade matcha latte.', 'drink', 'BT-0005', 26.00, 55.00, 34, 20, 'Bonbon Pics/Milktea4.jpg'],
        ['BT-0006', 2, 'Taro Milk Tea', 'Taro puree with coconut cream.', 'drink', 'BT-0006', 25.00, 55.00, 40, 20, 'Bonbon Pics/Milktea4.jpg'],
        ['BT-0007', 2, 'Strawberry Milk Tea', 'Strawberry jam & lychee jelly.', 'drink', 'BT-0007', 24.00, 55.00, 42, 20, 'Bonbon Pics/Milktea1.jpg'],
        ['BT-0008', 2, 'Chocolate Milk Tea', 'Rich cocoa with malt pearls.', 'drink', 'BT-0008', 24.00, 55.00, 45, 20, 'Bonbon Pics/Milktea4.jpg'],
        ['BT-0009', 2, 'Brown Sugar Milk Tea', 'Thick brown sugar syrup swirl.', 'drink', 'BT-0009', 32.00, 80.00, 19, 15, 'Bonbon Pics/Milktea2.jpg'],
        
        // Cups & Packaging (category_id = 3)
        ['SUP-0001', 3, '16oz Cup', 'PET 16oz cups for bubble tea line.', 'piece', 'SUP-0001', 0.60, 1.30, 480, 250, 'Bonbon Pics/Logo.png']
    ];
    
    $inserted = 0;
    $skipped = 0;
    
    foreach ($products as $product) {
        list($client_product_id, $category_id, $name, $description, $unit, $sku, $cost_price, $selling_price, $stock_quantity, $reorder_level, $image_path) = $product;
        
        // Check if product already exists
        $check = $conn->query("SELECT product_id FROM products WHERE client_product_id = '$client_product_id' OR sku = '$sku'");
        
        if ($check->num_rows == 0) {
            $sql = "INSERT INTO products (client_product_id, category_id, name, description, unit, sku, cost_price, selling_price, stock_quantity, reorder_level, is_active, image_path, created_by, updated_by) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1, 1)";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sissssddiis", 
                $client_product_id,
                $category_id,
                $name,
                $description,
                $unit,
                $sku,
                $cost_price,
                $selling_price,
                $stock_quantity,
                $reorder_level,
                $image_path
            );
            
            if ($stmt->execute()) {
                $inserted++;
            } else {
                echo "Error inserting product $name: " . $conn->error . "<br>";
            }
        } else {
            $skipped++;
        }
    }
    
    return ['inserted' => $inserted, 'skipped' => $skipped];
}

// Run population if accessed directly
if (basename($_SERVER['PHP_SELF']) == 'populate_products.php') {
    $result = populateProducts();
    echo "<!DOCTYPE html><html><head><title>Populate Products</title>";
    echo "<style>body{font-family:Arial;padding:20px;background:#f5f5f5;}";
    echo ".container{max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:10px;}";
    echo ".success{color:#28a745;padding:15px;background:#d4edda;border-radius:5px;margin:10px 0;}";
    echo "</style></head><body><div class='container'>";
    echo "<h1>Database Population</h1>";
    echo "<div class='success'>";
    echo "✅ Inserted: {$result['inserted']} products<br>";
    echo "⏭️ Skipped: {$result['skipped']} products (already exist)";
    echo "</div>";
    echo "<p><a href='inventory.php'>Go to Inventory</a></p>";
    echo "</div></body></html>";
}
?>

