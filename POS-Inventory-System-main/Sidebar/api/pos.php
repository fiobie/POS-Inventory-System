<?php
/**
 * POS API Endpoint
 * Handles: product listing, order placement, order cancellation
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'connections.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        // Return all products with category info
        $format = $_GET['format'] ?? '';

        $stmt = $pdo->query("
            SELECT 
                p.product_id,
                p.name,
                p.selling_price as price,
                p.image_path,
                COALESCE(c.slug, 'uncategorized') as category
            FROM products p
            LEFT JOIN product_categories c ON p.category_id = c.category_id
            WHERE p.is_active = 1
            ORDER BY p.category_id, p.name
        ");
        $products = $stmt->fetchAll();

        echo json_encode(['products' => $products]);
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $action = $input['action'] ?? '';

        switch ($action) {
            case 'place_order':
                $paymentMethod = $input['paymentMethod'] ?? 'cash';
                $notes = $input['notes'] ?? '';
                $total = isset($input['total']) ? floatval($input['total']) : 0;
                $items = $input['items'] ?? [];

                if (empty($items)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'empty_order']);
                    exit;
                }

                $pdo->beginTransaction();

                try {
                    // Generate order number
                    $orderNumber = 'ORD-' . date('Ymd') . '-' . str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT);

                    // Insert order
                    $stmt = $pdo->prepare("
                        INSERT INTO orders (order_number, total_amount, payment_method, notes, items_json, created_at)
                        VALUES (?, ?, ?, ?, ?, NOW())
                    ");
                    $stmt->execute([
                        $orderNumber,
                        $total,
                        $paymentMethod,
                        $notes,
                        json_encode($items)
                    ]);

                    $orderId = $pdo->lastInsertId();
                    $pdo->commit();

                    echo json_encode([
                        'success' => true,
                        'order_id' => $orderId,
                        'order_number' => $orderNumber
                    ]);
                } catch (Exception $e) {
                    $pdo->rollBack();
                    throw $e;
                }
                break;

            case 'cancel_order':
                $orderId = isset($input['orderId']) ? intval($input['orderId']) : 0;

                if ($orderId <= 0) {
                    http_response_code(400);
                    echo json_encode(['error' => 'invalid_order_id']);
                    exit;
                }

                // Check if orders table has a status column, if not just delete
                try {
                    $stmt = $pdo->prepare("UPDATE orders SET status = 'cancelled', cancelled_at = NOW() WHERE order_id = ?");
                    $stmt->execute([$orderId]);
                } catch (Exception $e) {
                    // If status column doesn't exist, try deleting
                    $stmt = $pdo->prepare("DELETE FROM orders WHERE order_id = ?");
                    $stmt->execute([$orderId]);
                }

                echo json_encode(['success' => true]);
                break;

            default:
                http_response_code(400);
                echo json_encode(['error' => 'unknown_action']);
        }
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);

} catch (Exception $e) {
    http_response_code(500);
    error_log('Error in pos.php: ' . $e->getMessage());
    echo json_encode(['error' => 'db_error']);
}
