<?php include 'db_connection.php'; ?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Bonbon Kitchen</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="dashboard.css">
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

        <!-- Main Content -->
        <main class="main-content">
            <header class="header">
                <button class="sidebar-toggle" id="sidebarToggle">
                    <i class="fas fa-bars"></i>
                </button>
                <h2 class="page-title">Dashboard</h2>
                <div class="user-profile">
                    <div class="user-icon">
                        <img src="Bonbon Pics/Logo.png" alt="User avatar" data-user-avatar data-default-avatar="Bonbon Pics/Logo.png">
                    </div>
                    <span class="user-name" data-user-name>User Name</span>
                </div>
            </header>

            <!-- KPI Cards -->
            <section class="kpi-section">
                <div class="kpi-card">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Today's Revenue</h3>
                        <span class="kpi-icon"><i class="fas fa-peso-sign"></i></span>
                    </div>
                    <div class="kpi-value">-</div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Monthly Revenue</h3>
                        <span class="kpi-icon"><i class="fas fa-chart-line"></i></span>
                    </div>
                    <div class="kpi-value">-</div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Average Order Value</h3>
                        <span class="kpi-icon"><i class="fas fa-shopping-bag"></i></span>
                    </div>
                    <div class="kpi-value">-</div>
                </div>

                <div class="kpi-card clickable" data-navigate="inventory">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Products in Stock</h3>
                        <span class="kpi-icon"><i class="fas fa-boxes"></i></span>
                    </div>
                    <div class="kpi-value">-</div>
                </div>

                <div class="kpi-card clickable" data-navigate="inventory">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Total Items</h3>
                        <span class="kpi-icon"><i class="fas fa-box"></i></span>
                    </div>
                    <div class="kpi-value">-</div>
                </div>

                <div class="kpi-card clickable" data-navigate="inventory">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Low Stock</h3>
                        <span class="kpi-icon"><i class="fas fa-exclamation-triangle"></i></span>
                    </div>
                    <div class="kpi-value">-</div>
                </div>

                <div class="kpi-card clickable" data-navigate="inventory">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Out of Stock</h3>
                        <span class="kpi-icon"><i class="fas fa-ban"></i></span>
                    </div>
                    <div class="kpi-value">-</div>
                </div>

                <div class="kpi-card clickable" data-navigate="inventory">
                    <div class="kpi-header">
                        <h3 class="kpi-title">Total Value</h3>
                        <span class="kpi-icon"><i class="fas fa-peso-sign"></i></span>
                    </div>
                    <div class="kpi-value">-</div>
                </div>
            </section>

            <!-- Charts Section -->
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

    <script src="user-profile.js"></script>
    <script src="dashboard.js"></script>
</body>
</html>
