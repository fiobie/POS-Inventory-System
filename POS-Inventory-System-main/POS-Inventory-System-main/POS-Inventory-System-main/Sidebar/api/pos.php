<?php
require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $input = json_decode(file_get_contents('php://input'), true);
    $action = isset($input['action']) ? $input['action'] : '';

    $ok = function($data) { echo json_encode($data); exit; };
    $err = function($code, $http = 400) { http_response_code($http); echo json_encode(['error' => $code]); exit; };

    if ($action === 'place_order') {
        $payment = trim($input['paymentMethod'] ?? 'cash');
        $notes = trim($input['notes'] ?? '');
        $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : [];
        $total = (float)($input['total'] ?? 0);
        if (empty($items)) $err('no_items');
        try {
            $pdo->beginTransaction();
            $orderNumber = 'POS-' . date('Ymd-His') . '-' . mt_rand(100,999);
            $placedAt = date('Y-m-d H:i:s');
            $stmt = $pdo->prepare('INSERT INTO orders (order_number, order_source, order_status, payment_method, subtotal_amount, discount_amount, tax_amount, total_amount, notes, placed_at) VALUES (?, "pos", "paid", ?, ?, 0.00, 0.00, ?, ?, ?)');
            $stmt->execute([$orderNumber, $payment, $total, $total, $notes, $placedAt]);
            $orderId = (int)$pdo->lastInsertId();

            $findProduct = $pdo->prepare('SELECT product_id FROM products WHERE client_product_id = ? OR name = ? LIMIT 1');
            $insertItem = $pdo->prepare('INSERT INTO order_items (order_id, product_id, item_name, unit_price, quantity, line_total, size_label) VALUES (?, ?, ?, ?, ?, ?, ?)');

            foreach ($items as $it) {
                $cid = trim($it['id'] ?? '');
                $nm = trim($it['baseName'] ?? ($it['name'] ?? ''));
                $qty = (int)($it['quantity'] ?? 1);
                $price = (float)($it['price'] ?? 0);
                $size = strtolower(trim($it['size'] ?? ''));
                $line = $price * $qty;
                $findProduct->execute([$cid, $nm]);
                $prow = $findProduct->fetch();
                $pid = $prow ? (int)$prow['product_id'] : null;
                $insertItem->execute([$orderId, $pid, $nm, $price, $qty, $line, $size ?: null]);

                if ($pid) {
                    $rec = $pdo->prepare('SELECT r.recipe_id FROM recipes r WHERE r.product_id = ? AND r.is_active = 1 LIMIT 1');
                    $rec->execute([$pid]);
                    $rrow = $rec->fetch();
                    $recipeNames = [];
                    if ($rrow) {
                        $rid = (int)$rrow['recipe_id'];
                        $itemsStmt = $pdo->prepare('SELECT ri.ingredient_id, ri.quantity, ri.unit, ri.notes, i.name AS ing_name FROM recipe_items ri JOIN ingredients i ON i.ingredient_id = ri.ingredient_id WHERE ri.recipe_id = ?');
                        $itemsStmt->execute([$rid]);
                        $recipeItems = $itemsStmt->fetchAll();
                        $recipeNames = array_map(function($ri){ return strtolower((string)$ri['ing_name']); }, $recipeItems);
                        foreach ($recipeItems as $ri) {
                            // Base per-serving quantity from recipe
                            $perServing = (float)$ri['quantity'];
                            $ingId = (int)$ri['ingredient_id'];
                            if ($size) {
                                if (strtolower($ri['ing_name']) === 'cup') {
                                    $cupName = $size === 'small' ? 'Cup 12oz' : ($size === 'medium' ? 'Cup 16oz' : ($size === 'large' ? 'Cup 22oz' : 'Cup'));
                                    $findIng = $pdo->prepare('SELECT ingredient_id FROM ingredients WHERE name = ? LIMIT 1');
                                    $findIng->execute([$cupName]);
                                    $rowIng = $findIng->fetch();
                                    if ($rowIng) $ingId = (int)$rowIng['ingredient_id'];
                                } else {
                                    // Prefer explicit per-size portions from notes: portion_ml_small|medium|large or portion_g_*.
                                    $u = strtolower($ri['unit'] ?? '');
                                    $notesRaw = (string)($ri['notes'] ?? '');
                                    $notes = [];
                                    foreach (explode(';', $notesRaw) as $pair) {
                                        $parts = explode('=', $pair, 2);
                                        if (count($parts) === 2) { $notes[trim($parts[0])] = trim($parts[1]); }
                                    }
                                    if ($u === 'ml') {
                                        $key = $size === 'small' ? 'portion_ml_small' : ($size === 'medium' ? 'portion_ml_medium' : ($size === 'large' ? 'portion_ml_large' : ''));
                                        if ($key && isset($notes[$key]) && is_numeric($notes[$key])) {
                                            $perServing = (float)$notes[$key];
                                        } else {
                                            $factor = $size === 'small' ? 1.0 : ($size === 'medium' ? (16/12) : ($size === 'large' ? (22/12) : 1.0));
                                            $perServing = $perServing * $factor;
                                        }
                                    } elseif ($u === 'g') {
                                        $key = $size === 'small' ? 'portion_g_small' : ($size === 'medium' ? 'portion_g_medium' : ($size === 'large' ? 'portion_g_large' : ''));
                                        if ($key && isset($notes[$key]) && is_numeric($notes[$key])) {
                                            $perServing = (float)$notes[$key];
                                        } else {
                                            $factor = $size === 'small' ? 1.0 : ($size === 'medium' ? (16/12) : ($size === 'large' ? (22/12) : 1.0));
                                            $perServing = $perServing * $factor;
                                        }
                                    }
                                }
                            }
                            $need = $perServing * $qty;
                            $curStmt = $pdo->prepare('SELECT current_stock FROM ingredients WHERE ingredient_id = ? FOR UPDATE');
                            $curStmt->execute([$ingId]);
                            $cur = $curStmt->fetch();
                            if ($cur) {
                                $newBal = max(0.0, ((float)$cur['current_stock']) - $need);
                                $upd = $pdo->prepare('UPDATE ingredients SET current_stock = ? WHERE ingredient_id = ?');
                                $upd->execute([$newBal, $ingId]);
                                $mov = $pdo->prepare('INSERT INTO ingredient_movements (ingredient_id, order_id, recipe_id, movement_type, quantity_change, balance_after, reference_note) VALUES (?, ?, ?, "consumption", ?, ?, ?)');
                                $mov->execute([$ingId, $orderId, $rid, -$need, $newBal, $nm]);
                            }
                        }
                    }

                    // Packaging deduction independent of recipe (also when recipe missing)
                    if ($size) {
                        $cupName = $size === 'small' ? 'Cup 12oz' : ($size === 'medium' ? 'Cup 16oz' : ($size === 'large' ? 'Cup 22oz' : 'Cup'));
                        $packs = [
                            ['name' => $cupName, 'unit' => 'pcs'],
                            ['name' => 'Straw', 'unit' => 'pcs'],
                            ['name' => 'Lid', 'unit' => 'pcs'],
                            ['name' => 'Sticker', 'unit' => 'pcs'],
                            ['name' => 'Plastic', 'unit' => 'pcs']
                        ];
                        foreach ($packs as $pk) {
                            if (!empty($recipeNames) && in_array(strtolower($pk['name']), $recipeNames, true)) continue; // already deducted via recipe
                            $findIng = $pdo->prepare('SELECT ingredient_id, current_stock FROM ingredients WHERE name = ? AND unit = ? LIMIT 1');
                            $findIng->execute([$pk['name'], $pk['unit']]);
                            $ingRow = $findIng->fetch();
                            if ($ingRow) {
                                $ingId2 = (int)$ingRow['ingredient_id'];
                                $cur2 = (float)$ingRow['current_stock'];
                                $newBal2 = max(0.0, $cur2 - $qty);
                                $upd2 = $pdo->prepare('UPDATE ingredients SET current_stock = ? WHERE ingredient_id = ?');
                                $upd2->execute([$newBal2, $ingId2]);
                                $mov2 = $pdo->prepare('INSERT INTO ingredient_movements (ingredient_id, order_id, recipe_id, movement_type, quantity_change, balance_after, reference_note) VALUES (?, ?, ?, "consumption", ?, ?, ?)');
                                $mov2->execute([$ingId2, $orderId, $rrow ? (int)$rrow['recipe_id'] : null, -$qty, $newBal2, $nm]);
                            }
                        }
                    }
                }
            }

            $pdo->commit();
            $ok(['status' => 'success', 'order_id' => $orderId, 'order_number' => $orderNumber]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            $err('db_error');
        }
    } elseif ($action === 'cancel_order') {
        $oid = (int)($input['orderId'] ?? 0);
        if (!$oid) $err('missing_identifier', 422);
        try {
            $getOrder = $pdo->prepare('SELECT order_id, order_number, payment_method, total_amount, notes FROM orders WHERE order_id = ? LIMIT 1');
            $getOrder->execute([$oid]);
            $ord = $getOrder->fetch();
            if (!$ord) $err('order_not_found', 404);
            $getItems = $pdo->prepare('SELECT item_name, unit_price, quantity, line_total FROM order_items WHERE order_id = ?');
            $getItems->execute([$oid]);
            $items = $getItems->fetchAll();
            $pdo->exec("CREATE TABLE IF NOT EXISTS order_archives (
                archive_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                order_id BIGINT UNSIGNED,
                order_number VARCHAR(64),
                payment_method VARCHAR(32),
                total_amount DECIMAL(12,2),
                notes VARCHAR(255),
                items_json JSON,
                cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (archive_id),
                KEY idx_order_archives_order (order_id)
            ) ENGINE=InnoDB");
            $ins = $pdo->prepare('INSERT INTO order_archives (order_id, order_number, payment_method, total_amount, notes, items_json) VALUES (?, ?, ?, ?, ?, ?)');
            $ins->execute([$ord['order_id'], $ord['order_number'], $ord['payment_method'], $ord['total_amount'], $ord['notes'], json_encode($items)]);
            $upd = $pdo->prepare('UPDATE orders SET order_status = ? WHERE order_id = ?');
            $upd->execute(['cancelled', $oid]);
            $ok(['status' => 'success']);
        } catch (Exception $e) {
            $err('db_error', 500);
        }
    }
    $err('unknown_action');
}

// Fetch active products with category
$products_query = "SELECT 
    p.product_id,
    p.client_product_id,
    p.name,
    p.selling_price,
    p.stock_quantity,
    p.is_active,
    p.image_path,
    pc.slug as category_slug,
    pc.name as category_name
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.category_id
WHERE p.is_active = 1
ORDER BY p.product_id DESC";

$stmt = $pdo->query($products_query);
$rows = $stmt ? $stmt->fetchAll() : [];
$products = array_map(function($row) {
    return [
        'id' => ($row['client_product_id'] ?: ('#' . str_pad((int)$row['product_id'], 4, '0', STR_PAD_LEFT))),
        'product_id' => (int)$row['product_id'],
        'name' => $row['name'],
        'category' => ($row['category_slug'] ?: 'uncategorized'),
        'category_name' => ($row['category_name'] ?: 'Uncategorized'),
        'price' => (float)$row['selling_price'],
        'stock' => (int)$row['stock_quantity'],
        'image_path' => $row['image_path']
    ];
}, $rows);

if ((isset($_GET['format']) && $_GET['format'] === 'json') || isset($_GET['action'])) {
    header('Content-Type: application/json');
    $action = isset($_GET['action']) ? $_GET['action'] : 'products';
    if ($action === 'products') {
        echo json_encode(['products' => $products]);
        exit;
    } elseif ($action === 'archives') {
        $type = isset($_GET['type']) ? $_GET['type'] : 'orders';
        if ($type === 'orders') {
            $q = isset($_GET['q']) ? trim($_GET['q']) : '';
            $from = isset($_GET['from']) ? $_GET['from'] : '';
            $to = isset($_GET['to']) ? $_GET['to'] : '';
            $sql = 'SELECT archive_id, order_id, order_number, payment_method, total_amount, notes, cancelled_at FROM order_archives WHERE 1=1';
            $params = [];
            if ($q !== '') { $sql .= ' AND (order_number LIKE ? OR order_id = ?)'; $params[] = "%$q%"; $params[] = is_numeric($q) ? (int)$q : 0; }
            if ($from !== '') { $sql .= ' AND cancelled_at >= ?'; $params[] = $from; }
            if ($to !== '') { $sql .= ' AND cancelled_at <= ?'; $params[] = $to; }
            $sql .= ' ORDER BY cancelled_at DESC, archive_id DESC LIMIT 500';
            $st = $pdo->prepare($params ? $sql : str_replace(' WHERE 1=1', '', $sql));
            $st->execute($params);
            $rows = $st->fetchAll();
            echo json_encode(['type' => 'orders', 'rows' => $rows]);
            exit;
        }
        echo json_encode(['type' => $type, 'rows' => []]);
        exit;
    } elseif ($action === 'analytics') {
        try {
            $now = new DateTime('now');
            $year = (int)$now->format('Y');
            $month = (int)$now->format('n');
            $today = $now->format('Y-m-d');

            // Monthly totals for current year
            $monthly = array_fill(0, 12, 0.0);
            $stmt = $pdo->prepare('SELECT MONTH(placed_at) AS m, SUM(total_amount) AS t FROM orders WHERE YEAR(placed_at) = ? AND order_status = "paid" GROUP BY MONTH(placed_at)');
            $stmt->execute([$year]);
            foreach ($stmt->fetchAll() as $row) {
                $m = max(1, min(12, (int)$row['m'])) - 1;
                $monthly[$m] = (float)$row['t'];
            }

            // Today and month aggregates
            $todayStmt = $pdo->prepare('SELECT COALESCE(SUM(total_amount),0) AS today_total FROM orders WHERE DATE(placed_at) = ? AND order_status = "paid"');
            $todayStmt->execute([$today]);
            $todayTotal = (float)($todayStmt->fetch()['today_total'] ?? 0);

            $monthStmt = $pdo->prepare('SELECT COALESCE(SUM(total_amount),0) AS month_total, COALESCE(AVG(total_amount),0) AS aov FROM orders WHERE YEAR(placed_at) = ? AND MONTH(placed_at) = ? AND order_status = "paid"');
            $monthStmt->execute([$year, $month]);
            $mrow = $monthStmt->fetch();
            $monthTotal = (float)($mrow['month_total'] ?? 0);
            $avgOrder = (float)($mrow['aov'] ?? 0);

            // Top items for current month by quantity
            $topChicken = [];
            $topBubble = [];
            $ti = $pdo->prepare('SELECT oi.item_name AS name, SUM(oi.quantity) AS qty, pc.slug AS slug FROM order_items oi JOIN orders o ON oi.order_id = o.order_id LEFT JOIN products p ON oi.product_id = p.product_id LEFT JOIN product_categories pc ON p.category_id = pc.category_id WHERE YEAR(o.placed_at) = ? AND MONTH(o.placed_at) = ? GROUP BY oi.item_name, pc.slug');
            $ti->execute([$year, $month]);
            foreach ($ti->fetchAll() as $row) {
                $slug = $row['slug'] ?: '';
                $entry = [$row['name'], (int)$row['qty']];
                if ($slug === 'chicken') $topChicken[] = $entry;
                else if ($slug === 'bubbletea') $topBubble[] = $entry;
            }
            // sort and slice top 5
            usort($topChicken, function($a,$b){ return $b[1] <=> $a[1]; });
            usort($topBubble, function($a,$b){ return $b[1] <=> $a[1]; });
            $topChicken = array_slice($topChicken, 0, 5);
            $topBubble = array_slice($topBubble, 0, 5);

            echo json_encode([
                'monthlyTotals' => $monthly,
                'todayProfit' => $todayTotal,
                'monthProfit' => $monthTotal,
                'avgOrderValue' => $avgOrder,
                'topChicken' => $topChicken,
                'topBubbleTea' => $topBubble
            ]);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'db_error']);
            exit;
        }
    } elseif ($action === 'sales_report') {
        try {
            $start = isset($_GET['start']) ? $_GET['start'] : date('Y-m-d 00:00:00');
            $end = isset($_GET['end']) ? $_GET['end'] : date('Y-m-d 23:59:59');
            
            // Total sales
            $totalStmt = $pdo->prepare('SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE placed_at >= ? AND placed_at <= ? AND order_status = "paid"');
            $totalStmt->execute([$start, $end]);
            $total = (float)($totalStmt->fetch()['total'] ?? 0);
            
            // Total orders
            $ordersStmt = $pdo->prepare('SELECT COUNT(*) AS count FROM orders WHERE placed_at >= ? AND placed_at <= ? AND order_status = "paid"');
            $ordersStmt->execute([$start, $end]);
            $orders = (int)($ordersStmt->fetch()['count'] ?? 0);
            
            // Average order value
            $avgOrder = $orders > 0 ? ($total / $orders) : 0;
            
            // Best selling item
            $bestStmt = $pdo->prepare('SELECT oi.item_name, SUM(oi.quantity) AS qty FROM order_items oi JOIN orders o ON oi.order_id = o.order_id WHERE o.placed_at >= ? AND o.placed_at <= ? AND o.order_status = "paid" GROUP BY oi.item_name ORDER BY qty DESC LIMIT 1');
            $bestStmt->execute([$start, $end]);
            $bestRow = $bestStmt->fetch();
            $bestSeller = $bestRow ? $bestRow['item_name'] : null;
            
            echo json_encode([
                'total' => $total,
                'orders' => $orders,
                'avgOrder' => $avgOrder,
                'bestSeller' => $bestSeller
            ]);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'db_error']);
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>POS - Bonbon Kitchen</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../pos.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css">
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
                <a href="dashboard.php" class="nav-item" data-page="dashboard">
                    <span class="nav-icon"><i class="fas fa-th-large"></i></span>
                    <span class="nav-text">Dashboard</span>
                </a>
                <a href="pos.php" class="nav-item active" data-page="pos">
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
                <h2 class="page-title">POS</h2>
                <div class="user-profile">
                    <div class="user-icon">
                        <img src="../Bonbon Pics/Logo.png" alt="Logo" data-user-avatar data-default-avatar="../Bonbon Pics/Logo.png">
                    </div>
                    <span class="user-name" data-user-name>BonBon Kitchen</span>
                </div>
            </header>

            <div class="content-wrapper">
                <section class="product-catalog">
                    <div class="catalog-header">
                        <h3 class="catalog-title">Product Catalog</h3>
                        <div class="catalog-actions">
                            <button class="add-product-btn" id="openAddProductBtn">
                                <i class="fas fa-plus"></i>
                                Add Product
                            </button>
                            <div class="categories-dropdown">
                                <button class="categories-btn" id="categoriesBtn">
                                    Categories
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div class="dropdown-menu" id="dropdownMenu">
                                    <a href="#" class="dropdown-item" data-category="all">All Products</a>
                                    <a href="#" class="dropdown-item" data-category="chicken">Chicken Flavors</a>
                                    <a href="#" class="dropdown-item" data-category="bubbletea">Bubble Tea Flavors</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="products-grid" id="productsGrid"></div>
                </section>

                <aside class="order-summary">
                    <div class="order-header">
                        <h3 class="order-title">Order</h3>
                        <button class="order-list-btn" id="orderListBtn">Order List</button>
                    </div>

                    <div class="order-items-container" id="orderItemsContainer">
                        <div class="empty-order">
                            <i class="fas fa-shopping-cart"></i>
                            <p>No items in order</p>
                        </div>
                    </div>

                    <div class="order-notes">
                        <label for="notesInput">Notes/Special Instructions:</label>
                        <textarea id="notesInput" placeholder="Enter Customer notes.." rows="3"></textarea>
                    </div>

                    <div class="payment-method">
                        <h4>Payment Method</h4>
                        <div class="radio-group">
                            <label class="radio-label">
                                <input type="radio" name="payment" value="cash" checked>
                                <span class="radio-custom"></span>
                                Cash
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="payment" value="gcash">
                                <span class="radio-custom"></span>
                                GCash
                            </label>
                        </div>
                    </div>

                    <div class="total-price">
                        <span>Total Price: ₱</span>
                        <span id="totalPrice">0.00</span>
                    </div>

                    <div class="confirm-btn-container">
                        <button class="confirm-btn" id="confirmBtn">Confirm</button>
                    </div>
                </aside>
            </div>
        </main>
    </div>

    <div class="modal-overlay" id="orderListModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>
                    <i class="fas fa-clipboard-list"></i>
                    Order List
                </h3>
                <button class="close-btn" id="closeModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="order-controls">
                    <div class="date-filter">
                        <label for="orderDateFilter">Select Date:</label>
                        <input type="date" id="orderDateFilter">
                    </div>
                    <div class="export-buttons">
                        <button class="export-btn" id="exportCsvBtn"><i class="fas fa-file-excel"></i> Excel</button>
                        <button class="export-btn" id="exportPdfBtn"><i class="fas fa-file-pdf"></i> PDF</button>
                    </div>
                </div>
                <div class="order-list-table-container">
                    <table class="order-list-table" id="orderListTable">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Product Name</th>
                                <th>Qty.</th>
                                <th>Price/Item</th>
                                <th>Payment</th>
                                <th>Total Price</th>
                                <th>Date</th>
                                <th>Notes</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="orderListBody"></tbody>
                    </table>
                    <div class="empty-order-list" id="emptyOrderList">
                        <i class="fas fa-clipboard-list"></i>
                        <p>No orders for today</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="addProductModal">
        <div class="modal-content product-modal">
            <div class="modal-header">
                <h3>
                    <i class="fas fa-drumstick-bite"></i>
                    Add New Product
                </h3>
                <button class="close-btn" id="closeAddProductBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form class="modal-body add-product-form" id="addProductForm">
                <div class="form-grid">
                    <label class="form-control">
                        <span>Product Name</span>
                        <input type="text" id="productNameInput" placeholder="e.g. Garlic Parmesan" required>
                    </label>
                    <label class="form-control">
                        <span>Price (₱)</span>
                        <input type="number" id="productPriceInput" min="1" step="1" placeholder="149" required>
                    </label>
                    <label class="form-control">
                        <span>Category</span>
                        <select id="productCategoryInput">
                            <option value="chicken" selected>Chicken Flavors</option>
                            <option value="bubbletea">Bubble Tea Flavors</option>
                        </select>
                    </label>
                </div>

                <div class="image-upload-group">
                    <div class="group-header">
                        <span>Product Image</span>
                        <small>Upload an image then crop it to match the round product card.</small>
                    </div>
                    <input type="file" id="productImageInput" accept="image/*" required>
                    <div class="cropper-panels">
                        <div class="cropper-wrapper">
                            <img id="cropperImage" alt="Crop selection preview">
                        </div>
                        <div class="crop-preview-container">
                            <span>Preview</span>
                            <div class="crop-preview"></div>
                        </div>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="secondary-btn" id="cancelAddProductBtn">Cancel</button>
                    <button type="submit" class="primary-btn">Save Product</button>
                </div>
            </form>
        </div>
    </div>

    <div class="modal-overlay" id="confirmModal">
        <div class="modal-content confirm-modal">
            <div class="modal-header">
                <h3>
                    <i class="fas fa-question-circle"></i>
                    Confirm Action
                </h3>
                <button class="close-btn" id="closeConfirmBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p id="confirmMessage"></p>
                <div class="modal-actions" style="justify-content:center;">
                    <button class="primary-btn" id="confirmYesBtn">Yes</button>
                    <button class="secondary-btn" id="confirmNoBtn">Cancel</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="noticeModal">
        <div class="modal-content notice-modal">
            <div class="modal-header">
                <h3 id="noticeTitle"><i class="fas fa-info-circle"></i> Notice</h3>
                <button class="close-btn" id="closeNoticeBtn"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p id="noticeMessage"></p>
                <div class="modal-actions" style="justify-content:center;">
                    <button class="primary-btn" id="noticeOkBtn">OK</button>
                </div>
            </div>
        </div>
    </div>

    <div id="toastContainer" class="toast-container"></div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <script src="../core/utils.js"></script>
    <script src="../core/sidebar-manager.js"></script>
    <script src="../user-profile.js"></script>
    <script src="../pos.js"></script>
</body>
</html>
