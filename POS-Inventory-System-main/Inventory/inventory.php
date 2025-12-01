<?php 
// Include database connection (adjust path if needed)
include '../Sidebar/db_connection.php'; 

// Select all products from the database
$products_query = "SELECT 
    p.product_id,
    p.client_product_id,
    p.name,
    p.selling_price,
    p.stock_quantity,
    p.reorder_level,
    p.is_active,
    p.image_path,
    pc.category_id,
    pc.name as category_name,
    pc.slug as category_slug
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.category_id
WHERE p.is_active = 1
ORDER BY p.product_id DESC";

$products_result = $conn->query($products_query);

// Store products in array for JavaScript
$products_data = [];
if ($products_result && $products_result->num_rows > 0) {
    while ($row = $products_result->fetch_assoc()) {
        $products_data[] = [
            'id' => $row['client_product_id'] ?: '#' . str_pad($row['product_id'], 4, '0', STR_PAD_LEFT),
            'product_id' => $row['product_id'],
            'name' => $row['name'],
            'category' => $row['category_slug'] ?: 'uncategorized',
            'category_name' => $row['category_name'] ?: 'Uncategorized',
            'price' => floatval($row['selling_price']),
            'stock' => intval($row['stock_quantity']),
            'reorder_level' => intval($row['reorder_level']),
            'image_path' => $row['image_path']
        ];
    }
}

// Get summary statistics
$summary_query = "SELECT 
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as products_in_stock,
    COUNT(*) as total_items,
    COUNT(CASE WHEN stock_quantity > 0 AND stock_quantity <= reorder_level THEN 1 END) as low_stock,
    COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock,
    SUM(selling_price * stock_quantity) as total_value
FROM products
WHERE is_active = 1";

$summary_result = $conn->query($summary_query);
$summary_data = [];
if ($summary_result) {
    $summary_row = $summary_result->fetch_assoc();
    $summary_data = [
        'productsInStock' => intval($summary_row['products_in_stock']),
        'totalItems' => intval($summary_row['total_items']),
        'lowStock' => intval($summary_row['low_stock']),
        'outOfStock' => intval($summary_row['out_of_stock']),
        'totalValue' => floatval($summary_row['total_value'] ?? 0)
    ];
}

// Get categories
$categories_query = "SELECT category_id, slug, name FROM product_categories ORDER BY name";
$categories_result = $conn->query($categories_query);
$categories_data = [];
if ($categories_result) {
    while ($row = $categories_result->fetch_assoc()) {
        $categories_data[] = [
            'id' => $row['category_id'],
            'slug' => $row['slug'],
            'name' => $row['name']
        ];
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inventory - Bonbon Kitchen</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="dashboard.css">
    <link rel="stylesheet" href="inventory.css">
</head>
<body>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <div class="container">
        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
            <button class="sidebar-close" id="sidebarClose">
                <i class="fas fa-times"></i>
            </button>
            <div class="sidebar-user-info">
                <img src="Bonbon Pics/Logo.png" alt="User avatar" class="sidebar-user-avatar" data-user-avatar data-default-avatar="Bonbon Pics/Logo.png">
                <div class="sidebar-user-text">
                    <span class="sidebar-user-name" data-user-name>Bonbon User</span>
                    <small class="sidebar-user-email" data-user-email>user@example.com</small>
                </div>
            </div>
            
            <nav class="nav-menu">
                <a href="dashboard.php" class="nav-item" data-page="dashboard">
                    <span class="nav-icon"><i class="fas fa-th-large"></i></span>
                    <span class="nav-text">Dashboard</span>
                </a>
                <a href="pos.php" class="nav-item" data-page="pos">
                    <span class="nav-icon"><i class="fas fa-shopping-cart"></i></span>
                    <span class="nav-text">POS</span>
                </a>
                <a href="inventory.php" class="nav-item active" data-page="inventory">
                    <span class="nav-icon"><i class="fas fa-box"></i></span>
                    <span class="nav-text">Inventory</span>
                </a>
                <a href="settings.php" class="nav-item" data-page="settings">
                    <span class="nav-icon"><i class="fas fa-cog"></i></span>
                    <span class="nav-text">Settings</span>
                </a>
            </nav>
            
            <div class="logout">
                <a href="#" class="nav-item">
                    <span class="nav-icon"><i class="fas fa-sign-out-alt"></i></span>
                    <span class="nav-text">Log Out</span>
                </a>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <header class="header">
                <button class="sidebar-toggle" id="sidebarToggle">
                    <i class="fas fa-bars"></i>
                </button>
                <h2 class="page-title">Inventory</h2>
                <div class="user-profile">
                    <div class="user-icon">
                        <img src="Bonbon Pics/Logo.png" alt="User avatar" data-user-avatar data-default-avatar="Bonbon Pics/Logo.png">
                    </div>
                    <span class="user-name" data-user-name>User Name</span>
                </div>
            </header>

            <!-- Summary Cards -->
            <section class="inventory-summary">
                <div class="summary-card">
                    <div class="summary-header">
                        <h3 class="summary-title">Products in Stock</h3>
                        <span class="summary-icon"><i class="fas fa-box"></i></span>
                    </div>
                    <div class="summary-value" id="productsInStock">0</div>
                </div>

                <div class="summary-card">
                    <div class="summary-header">
                        <h3 class="summary-title">Total Items</h3>
                        <span class="summary-icon"><i class="fas fa-box"></i></span>
                    </div>
                    <div class="summary-value" id="totalItems">0</div>
                </div>

                <div class="summary-card">
                    <div class="summary-header">
                        <h3 class="summary-title">Low Stock</h3>
                        <span class="summary-icon"><i class="fas fa-exclamation-triangle"></i></span>
                    </div>
                    <div class="summary-value" id="lowStock">0</div>
                </div>

                <div class="summary-card">
                    <div class="summary-header">
                        <h3 class="summary-title">Out of Stock</h3>
                        <span class="summary-icon"><i class="fas fa-ban"></i></span>
                    </div>
                    <div class="summary-value" id="outOfStock">0</div>
                </div>

                <div class="summary-card">
                    <div class="summary-header">
                        <h3 class="summary-title">Total Value</h3>
                        <span class="summary-icon"><i class="fas fa-peso-sign"></i></span>
                    </div>
                    <div class="summary-value" id="totalValue">₱0.00</div>
                </div>
            </section>

            <!-- Add Product Button -->
            <div class="add-product-section">
                <button class="add-product-btn" id="addProductBtn">
                    <i class="fas fa-plus"></i>
                    Add Product
                </button>
            </div>

            <!-- Products Details Section -->
            <section class="products-details">
                <div class="details-header">
                    <h3 class="details-title">Products Details:</h3>
                    <div class="details-controls">
                        <div class="search-container">
                            <input type="text" id="searchInput" class="search-input" placeholder="Search here">
                            <i class="fas fa-search search-icon"></i>
                        </div>
                        <button class="clear-filters-btn" id="clearFiltersBtn">Clear filters</button>
                        <div class="sort-container">
                            <span class="sort-label">Sort by</span>
                            <div class="sort-dropdown">
                                <button class="sort-btn" id="sortBtn">
                                    Category
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div class="sort-menu" id="sortMenu">
                                    <a href="#" class="sort-item" data-sort="all">All Categories</a>
                                    <!-- Categories will be dynamically populated -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="table-container">
                    <table class="products-table" id="productsTable">
                        <thead>
                            <tr>
                                <th>Product ID</th>
                                <th>Product Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Value</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="productsTableBody">
                            <!-- Products will be dynamically generated -->
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>

    <!-- Add/Edit Product Modal -->
    <div class="modal-overlay" id="productModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="modalTitle">
                    <i class="fas fa-box"></i>
                    Add Product
                </h3>
                <button class="close-btn" id="closeModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form class="modal-body" id="productForm">
                <div class="form-group">
                    <label for="productIdInput">Product ID:</label>
                    <input type="text" id="productIdInput" class="form-input" placeholder="e.g. 0123456" required>
                </div>
                <div class="form-group">
                    <label for="productNameInput">Product Name:</label>
                    <input type="text" id="productNameInput" class="form-input" placeholder="e.g. 16oz Cup" required>
                </div>
                <div class="form-group">
                    <label for="productCategoryInput">Category:</label>
                    <div class="category-input-wrapper">
                        <input type="text" id="productCategoryInput" class="form-input" list="categoryList" placeholder="Type or select category" required autocomplete="off">
                        <datalist id="categoryList">
                            <!-- Categories will be dynamically populated -->
                        </datalist>
                        <i class="fas fa-chevron-down category-dropdown-icon"></i>
                    </div>
                </div>
                <div class="form-group">
                    <label for="productPriceInput">Price (₱):</label>
                    <input type="number" id="productPriceInput" class="form-input" placeholder="e.g. 1.3" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label for="productStockInput">Stock:</label>
                    <input type="number" id="productStockInput" class="form-input" placeholder="e.g. 50" min="0" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" id="cancelBtn">Cancel</button>
                    <button type="submit" class="save-btn">Save</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Pass PHP data to JavaScript
        window.productsData = <?php echo json_encode($products_data); ?>;
        window.summaryData = <?php echo json_encode($summary_data); ?>;
        window.categoriesData = <?php echo json_encode($categories_data); ?>;
        
        console.log('Products loaded from database:', window.productsData.length);
        console.log('Summary data:', window.summaryData);
        console.log('Categories loaded:', window.categoriesData.length);
    </script>
    <script src="user-profile.js"></script>
    <script src="inventory.js"></script>
</body>
</html>