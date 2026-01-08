<?php
require_once 'connections.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if ($data === null || !isset($data['items']) || empty($data['items'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid or missing order data']);
            exit;
        }

        $items = $data['items'];
        $paymentMethod = $data['paymentMethod'] ?? 'cash';
        $notes = $data['notes'] ?? '';
        $userId = $data['userId'] ?? 1;

        $pdo->beginTransaction();

        $subtotalAmount = 0;
        foreach ($items as $item) {
            $subtotalAmount += $item['price'] * $item['quantity'];
        }
        $totalAmount = $subtotalAmount;

        $tmpOrderNumber = '';
        $stmt = $pdo->prepare("INSERT INTO orders (order_number, user_id, order_source, order_status, payment_method, subtotal_amount, discount_amount, tax_amount, total_amount, notes, placed_at) VALUES (?, ?, 'pos', 'pending', ?, ?, 0, 0, ?, ?, NOW())");
        $stmt->execute([$tmpOrderNumber, $userId, $paymentMethod, $subtotalAmount, $totalAmount, $notes]);
        $orderId = (int) $pdo->lastInsertId();

        $orderNumber = sprintf('POS-%s-%06d', date('Ymd'), $orderId);
        $updateOrderNumber = $pdo->prepare("UPDATE orders SET order_number = ? WHERE order_id = ?");
        $updateOrderNumber->execute([$orderNumber, $orderId]);

        foreach ($items as $item) {
            $clientProductId = isset($item['id']) ? intval($item['id']) : 0;
            $productId = null;

            if ($clientProductId > 0) {
                $checkByIdStmt = $pdo->prepare("SELECT product_id FROM products WHERE product_id = ? LIMIT 1");
                $checkByIdStmt->execute([$clientProductId]);
                $row = $checkByIdStmt->fetch();
                if ($row)
                    $productId = (int) $row['product_id'];
            }

            if (!$productId) {
                $nameLookup = $item['name'] ?? '';
                $checkByNameStmt = $pdo->prepare("SELECT product_id FROM products WHERE name = ? LIMIT 1");
                $checkByNameStmt->execute([$nameLookup]);
                $r2 = $checkByNameStmt->fetch();
                if ($r2)
                    $productId = (int) $r2['product_id'];
            }

            if (!$productId) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(['error' => 'Product not found', 'item' => $item]);
                exit;
            }

            $quantity = intval($item['quantity']);
            $unitPrice = floatval($item['price']);
            $lineTotal = $unitPrice * $quantity;
            $sizeLabel = $item['size'] ?? null;
            $itemName = $item['name'];

            $itemStmt = $pdo->prepare("INSERT INTO order_items (order_id, product_id, item_name, size_label, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $itemStmt->execute([$orderId, $productId, $itemName, $sizeLabel, $unitPrice, $quantity, $lineTotal]);

            $updateStockStmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?");
            $updateStockStmt->execute([$quantity, $productId]);

            $selectStockStmt = $pdo->prepare("SELECT stock_quantity FROM products WHERE product_id = ?");
            $selectStockStmt->execute([$productId]);
            $stockRow = $selectStockStmt->fetch();
            $latestStock = $stockRow ? $stockRow['stock_quantity'] : 0;

            $referenceNote = "Order $orderNumber";
            $quantityChange = -$quantity;

            $movementStmt = $pdo->prepare("INSERT INTO inventory_movements (product_id, order_id, movement_type, quantity_change, balance_after, reference_note, created_by, created_at) VALUES (?, ?, 'sale', ?, ?, ?, ?, NOW())");
            $movementStmt->execute([$productId, $orderId, $quantityChange, $latestStock, $referenceNote, $userId]);
        }

        if ($paymentMethod) {
            $paymentStmt = $pdo->prepare("INSERT INTO payments (order_id, payment_method, amount, status, paid_at, received_by) VALUES (?, ?, ?, 'completed', NOW(), ?)");
            $paymentStmt->execute([$orderId, $paymentMethod, $totalAmount, $userId]);
        }

        $pdo->commit();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'orderId' => $orderId,
            'orderNumber' => $orderNumber,
            'total' => $totalAmount
        ]);

    } elseif ($method === 'GET') {
        if (isset($_GET['id'])) {
            $orderId = intval($_GET['id']);

            $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_id = ?");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch();

            if (!$order) {
                http_response_code(404);
                echo json_encode(['error' => 'Order not found']);
                exit;
            }

            $itemsStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
            $itemsStmt->execute([$orderId]);
            $items = $itemsStmt->fetchAll();

            echo json_encode(['order' => $order, 'items' => $items]);

        } else {
            $stmt = $pdo->query("SELECT o.*, GROUP_CONCAT(CONCAT(oi.item_name, ' x', oi.quantity) SEPARATOR ', ') AS items FROM orders o LEFT JOIN order_items oi ON o.order_id = oi.order_id GROUP BY o.order_id ORDER BY o.placed_at DESC LIMIT 50");
            $orders = $stmt->fetchAll();
            echo json_encode($orders);
        }

    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
