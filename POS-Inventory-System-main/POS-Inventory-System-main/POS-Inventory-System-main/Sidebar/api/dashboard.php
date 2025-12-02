<?php
require __DIR__ . '/db.php';

// Summary stats for dashboard
$summary_query = "SELECT 
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as products_in_stock,
    COUNT(*) as total_items,
    COUNT(CASE WHEN stock_quantity > 0 AND stock_quantity <= reorder_level THEN 1 END) as low_stock,
    COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock,
    SUM(selling_price * stock_quantity) as total_value
FROM products
WHERE is_active = 1";

$summary_stmt = $pdo->query($summary_query);
$summary_row = $summary_stmt ? $summary_stmt->fetch() : [];
$summary_data = [
    'productsInStock' => (int)($summary_row['products_in_stock'] ?? 0),
    'totalItems' => (int)($summary_row['total_items'] ?? 0),
    'lowStock' => (int)($summary_row['low_stock'] ?? 0),
    'outOfStock' => (int)($summary_row['out_of_stock'] ?? 0),
    'totalValue' => (float)($summary_row['total_value'] ?? 0)
];

if (isset($_GET['format']) && $_GET['format'] === 'json') {
    header('Content-Type: application/json');
    echo json_encode(['summary' => $summary_data]);
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Bonbon Kitchen</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../dashboard.css">
</head>
<body>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <div class="container">
        <aside class="sidebar" id="sidebar">
            <button class="sidebar-close" id="sidebarClose">
                <i class="fas fa-times"></i>
            </button>
            <div class="sidebar-user-info">
                <img src="../Bonbon Pics/Logo.png" alt="Logo" class="sidebar-user-avatar">
                <div class="sidebar-user-text">
                    <span class="sidebar-user-name">BonBon Kitchen</span>
                </div>
            </div>
            
            <nav class="nav-menu">
                <a href="dashboard.php" class="nav-item active" data-page="dashboard">
                    <span class="nav-icon"><i class="fas fa-th-large"></i></span>
                    <span class="nav-text">Dashboard</span>
                </a>
                <a href="pos.php" class="nav-item" data-page="pos">
                    <span class="nav-icon"><i class="fas fa-shopping-cart"></i></span>
                    <span class="nav-text">POS</span>
                </a>
                <a href="inventory.php" class="nav-item" data-page="inventory">
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

        <main class="main-content">
            <header class="header">
                <button class="sidebar-toggle" id="sidebarToggle">
                    <i class="fas fa-bars"></i>
                </button>
                <h2 class="page-title">Dashboard</h2>
                <div class="user-profile">
                    <div class="user-icon">
                        <img src="../Bonbon Pics/Logo.png" alt="Logo" data-user-avatar data-default-avatar="../Bonbon Pics/Logo.png">
                    </div>
                    <span class="user-name" data-user-name>BonBon Kitchen</span>
                </div>
            </header>

            <section class="kpi-section">
                <div class="kpi-card">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Today's Profit</h3>
                        <span class="kpi-icon"><i class="fas fa-peso-sign"></i></span>
                    </div>
                    <div class="kpi-value" id="todayProfit">-</div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Monthly Profit</h3>
                        <span class="kpi-icon"><i class="fas fa-chart-line"></i></span>
                    </div>
                    <div class="kpi-value" id="monthlyProfit">-</div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Average Order Value</h3>
                        <span class="kpi-icon"><i class="fas fa-shopping-bag"></i></span>
                    </div>
                    <div class="kpi-value" id="avgOrderValue">-</div>
                </div>

                <div class="kpi-card clickable" data-navigate="inventory">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Products in Stock</h3>
                        <span class="kpi-icon"><i class="fas fa-boxes"></i></span>
                    </div>
                    <div class="kpi-value" id="productsInStock">-</div>
                </div>

                <div class="kpi-card clickable" data-navigate="inventory">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Total Products</h3>
                        <span class="kpi-icon"><i class="fas fa-box"></i></span>
                    </div>
                    <div class="kpi-value" id="totalItems">-</div>
                </div>

                <div class="kpi-card clickable" data-navigate="inventory">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Low Stock</h3>
                        <span class="kpi-icon"><i class="fas fa-exclamation-triangle"></i></span>
                    </div>
                    <div class="kpi-value" id="lowStock">-</div>
                </div>

                <div class="kpi-card clickable" data-navigate="inventory">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Out of Stock</h3>
                        <span class="kpi-icon"><i class="fas fa-ban"></i></span>
                    </div>
                    <div class="kpi-value" id="outOfStock">-</div>
                </div>

                <div class="kpi-card clickable" data-navigate="inventory">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Total Value</h3>
                        <span class="kpi-icon"><i class="fas fa-peso-sign"></i></span>
                    </div>
                    <div class="kpi-value" id="totalValue">-</div>
                </div>
            </section>

            <section class="charts-section">
                <div class="chart-container">
                    <h3 class="chart-title">Sales</h3>
                    <div class="chart-wrapper">
                        <canvas id="salesChart"></canvas>
                    </div>
                </div>

                <div class="chart-container">
                    <h3 class="chart-title">Top 5 Favorite Bubble Tea</h3>
                    <div class="chart-wrapper">
                        <canvas id="bubbleTeaChart"></canvas>
                    </div>
                </div>

                <div class="chart-container">
                    <h3 class="chart-title">Top 5 Favorite Chicken Flavors</h3>
                    <div class="chart-wrapper">
                        <canvas id="pieChart"></canvas>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <script src="../core/utils.js"></script>
    <script src="../core/sidebar-manager.js"></script>
    <script src="../user-profile.js"></script>
    <script src="../dashboard.js"></script>
</body>
</html>
