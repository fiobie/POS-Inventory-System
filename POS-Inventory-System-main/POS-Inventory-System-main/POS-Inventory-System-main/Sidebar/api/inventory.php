<?php 
// Include database connection (PDO)
require __DIR__ . '/db.php'; 

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $input = json_decode(file_get_contents('php://input'), true);
    $action = isset($input['action']) ? $input['action'] : '';
    try {
        if ($action === 'add_product') {
            $id = trim($input['id'] ?? '');
            $name = trim($input['name'] ?? '');
            $slug = trim($input['category'] ?? '');
            $price = (float)($input['price'] ?? 0);
            $stock = (int)($input['stock'] ?? 0);
            $catId = null;
            if ($name === '' || strlen($name) > 255) { http_response_code(422); echo json_encode(['error' => 'invalid_name']); exit; }
            if ($slug === '') { http_response_code(422); echo json_encode(['error' => 'invalid_category']); exit; }
            if (!is_numeric($price) || $price < 0) { http_response_code(422); echo json_encode(['error' => 'invalid_price']); exit; }
            if (!is_numeric($stock) || $stock < 0) { http_response_code(422); echo json_encode(['error' => 'invalid_stock']); exit; }
            if ($slug !== '') {
                $c = $pdo->prepare('SELECT category_id FROM product_categories WHERE slug = ? LIMIT 1');
                $c->execute([$slug]);
                $row = $c->fetch();
                if ($row) $catId = (int)$row['category_id']; else { http_response_code(422); echo json_encode(['error' => 'invalid_category']); exit; }
            }
            if ($id !== '') {
                $d = $pdo->prepare('SELECT product_id FROM products WHERE client_product_id = ? LIMIT 1');
                $d->execute([$id]);
                if ($d->fetch()) { http_response_code(409); echo json_encode(['error' => 'duplicate_product']); exit; }
            } else {
                $d = $pdo->prepare('SELECT product_id FROM products WHERE name = ? LIMIT 1');
                $d->execute([$name]);
                if ($d->fetch()) { http_response_code(409); echo json_encode(['error' => 'duplicate_product']); exit; }
            }
            $ins = $pdo->prepare('INSERT INTO products (client_product_id, name, selling_price, stock_quantity, reorder_level, is_active, category_id) VALUES (?, ?, ?, ?, 0, 1, ?)');
            $ins->execute([$id ?: null, $name, $price, $stock, $catId]);
            echo json_encode(['status' => 'success']);
            exit;
        } elseif ($action === 'update_product') {
            $id = trim($input['id'] ?? '');
            $name = trim($input['name'] ?? '');
            $slug = trim($input['category'] ?? '');
            $price = (float)($input['price'] ?? 0);
            $stock = (int)($input['stock'] ?? 0);
            $newClientId = trim($input['new_client_id'] ?? '');
            $catId = null;
            if ($name === '' || strlen($name) > 255) { http_response_code(422); echo json_encode(['error' => 'invalid_name']); exit; }
            if ($slug === '') { http_response_code(422); echo json_encode(['error' => 'invalid_category']); exit; }
            if (!is_numeric($price) || $price < 0) { http_response_code(422); echo json_encode(['error' => 'invalid_price']); exit; }
            if (!is_numeric($stock) || $stock < 0) { http_response_code(422); echo json_encode(['error' => 'invalid_stock']); exit; }
            if ($id === '' && $name === '') { http_response_code(422); echo json_encode(['error' => 'missing_identifier']); exit; }
            if ($slug !== '') {
                $c = $pdo->prepare('SELECT category_id FROM product_categories WHERE slug = ? LIMIT 1');
                $c->execute([$slug]);
                $row = $c->fetch();
                if ($row) $catId = (int)$row['category_id']; else { http_response_code(422); echo json_encode(['error' => 'invalid_category']); exit; }
            }
            $find = null;
            if ($id !== '') {
                $s = $pdo->prepare('SELECT product_id FROM products WHERE client_product_id = ? LIMIT 1');
                $s->execute([$id]);
                $find = $s->fetch();
            }
            if (!$find && $name !== '') {
                $s2 = $pdo->prepare('SELECT product_id FROM products WHERE name = ? LIMIT 1');
                $s2->execute([$name]);
                $find = $s2->fetch();
            }
            if (!$find) { http_response_code(404); echo json_encode(['error' => 'product_not_found']); exit; }
            $pid = (int)$find['product_id'];
            if ($newClientId !== '') {
                $d = $pdo->prepare('SELECT product_id FROM products WHERE client_product_id = ? LIMIT 1');
                $d->execute([$newClientId]);
                $dup = $d->fetch();
                if ($dup && (int)$dup['product_id'] !== $pid) { http_response_code(409); echo json_encode(['error' => 'duplicate_product']); exit; }
                $upd = $pdo->prepare('UPDATE products SET client_product_id = ?, name = ?, selling_price = ?, stock_quantity = ?, category_id = ? WHERE product_id = ?');
                $upd->execute([$newClientId, $name, $price, $stock, $catId, $pid]);
            } else {
                $upd = $pdo->prepare('UPDATE products SET name = ?, selling_price = ?, stock_quantity = ?, category_id = ? WHERE product_id = ?');
                $upd->execute([$name, $price, $stock, $catId, $pid]);
            }
            echo json_encode(['status' => 'success']);
            exit;
        } elseif ($action === 'delete_product') {
            $id = trim($input['id'] ?? '');
            $name = trim($input['name'] ?? '');
            if ($id === '' && $name === '') { http_response_code(422); echo json_encode(['error' => 'missing_identifier']); exit; }
            $target = null;
            if ($id !== '') {
                $s = $pdo->prepare('SELECT p.*, pc.slug AS category_slug FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.category_id WHERE p.client_product_id = ? LIMIT 1');
                $s->execute([$id]);
                $target = $s->fetch();
            }
            if (!$target && $name !== '') {
                $s2 = $pdo->prepare('SELECT p.*, pc.slug AS category_slug FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.category_id WHERE p.name = ? LIMIT 1');
                $s2->execute([$name]);
                $target = $s2->fetch();
            }
            if (!$target) { http_response_code(404); echo json_encode(['error' => 'product_not_found']); exit; }
            $pdo->exec("CREATE TABLE IF NOT EXISTS product_archives (
                archive_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                product_id INT UNSIGNED,
                client_product_id VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                category_id INT UNSIGNED NULL,
                category_slug VARCHAR(255) NULL,
                selling_price DECIMAL(10,4) DEFAULT 0,
                stock_quantity INT DEFAULT 0,
                deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (archive_id),
                KEY idx_product_archives_product (product_id),
                KEY idx_product_archives_name (name)
            ) ENGINE=InnoDB");
            $ins = $pdo->prepare('INSERT INTO product_archives (product_id, client_product_id, name, category_id, category_slug, selling_price, stock_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $ins->execute([
                (int)$target['product_id'],
                $target['client_product_id'],
                $target['name'],
                $target['category_id'],
                $target['category_slug'],
                (float)$target['selling_price'],
                (int)$target['stock_quantity']
            ]);
            $upd = $pdo->prepare('UPDATE products SET is_active = 0 WHERE product_id = ?');
            $upd->execute([(int)$target['product_id']]);
            echo json_encode(['status' => 'success']);
            exit;
        } elseif ($action === 'delete_ingredient') {
            $iid = isset($input['ingredient_id']) ? (int)$input['ingredient_id'] : 0;
            $name = trim($input['name'] ?? '');
            $unit = trim($input['unit'] ?? '');
            if (!$iid && ($name === '' || $unit === '')) { http_response_code(422); echo json_encode(['error' => 'missing_identifier']); exit; }
            $target = null;
            if ($iid) {
                $s = $pdo->prepare('SELECT * FROM ingredients WHERE ingredient_id = ? LIMIT 1');
                $s->execute([$iid]);
                $target = $s->fetch();
            }
            if (!$target && $name !== '' && $unit !== '') {
                $s2 = $pdo->prepare('SELECT * FROM ingredients WHERE name = ? AND unit = ? LIMIT 1');
                $s2->execute([$name, $unit]);
                $target = $s2->fetch();
            }
            if (!$target) { http_response_code(404); echo json_encode(['error' => 'ingredient_not_found']); exit; }
            $pdo->exec("CREATE TABLE IF NOT EXISTS ingredient_archives (
                archive_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                ingredient_id INT UNSIGNED,
                name VARCHAR(150) NOT NULL,
                unit VARCHAR(30) NOT NULL,
                current_stock DECIMAL(12,4) DEFAULT 0.0000,
                storage_location VARCHAR(100) NULL,
                deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (archive_id),
                KEY idx_ingredient_archives_ing (ingredient_id),
                KEY idx_ingredient_archives_name (name)
            ) ENGINE=InnoDB");
            $ins = $pdo->prepare('INSERT INTO ingredient_archives (ingredient_id, name, unit, current_stock, storage_location) VALUES (?, ?, ?, ?, ?)');
            $ins->execute([
                (int)$target['ingredient_id'],
                $target['name'],
                $target['unit'],
                (float)$target['current_stock'],
                $target['storage_location']
            ]);
            $upd = $pdo->prepare('UPDATE ingredients SET is_active = 0 WHERE ingredient_id = ?');
            $upd->execute([(int)$target['ingredient_id']]);
            echo json_encode(['status' => 'success']);
            exit;
        } elseif ($action === 'delete_recipe') {
            $rid = isset($input['recipe_id']) ? (int)$input['recipe_id'] : 0;
            $pid = isset($input['product_id']) ? (int)$input['product_id'] : 0;
            $pname = trim($input['product_name'] ?? '');
            $target = null;
            if ($rid) {
                $sr = $pdo->prepare('SELECT * FROM recipes WHERE recipe_id = ? LIMIT 1');
                $sr->execute([$rid]);
                $target = $sr->fetch();
            }
            if (!$target && $pid) {
                $sr2 = $pdo->prepare('SELECT * FROM recipes WHERE product_id = ? AND is_active = 1 LIMIT 1');
                $sr2->execute([$pid]);
                $target = $sr2->fetch();
            }
            if (!$target && $pname !== '') {
                $sp = $pdo->prepare('SELECT product_id FROM products WHERE name = ? LIMIT 1');
                $sp->execute([$pname]);
                $prow = $sp->fetch();
                if ($prow) {
                    $sr3 = $pdo->prepare('SELECT * FROM recipes WHERE product_id = ? AND is_active = 1 LIMIT 1');
                    $sr3->execute([(int)$prow['product_id']]);
                    $target = $sr3->fetch();
                }
            }
            if (!$target) { http_response_code(404); echo json_encode(['error' => 'recipe_not_found']); exit; }
            $itemsStmt = $pdo->prepare('SELECT ingredient_id, quantity, unit FROM recipe_items WHERE recipe_id = ?');
            $itemsStmt->execute([(int)$target['recipe_id']]);
            $items = $itemsStmt->fetchAll();
            $pdo->exec("CREATE TABLE IF NOT EXISTS recipe_archives (
                archive_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                recipe_id INT UNSIGNED,
                product_id INT UNSIGNED,
                recipe_name VARCHAR(150),
                notes TEXT,
                items_json JSON,
                deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (archive_id),
                KEY idx_recipe_archives_recipe (recipe_id),
                KEY idx_recipe_archives_product (product_id)
            ) ENGINE=InnoDB");
            $ins = $pdo->prepare('INSERT INTO recipe_archives (recipe_id, product_id, recipe_name, notes, items_json) VALUES (?, ?, ?, ?, ?)');
            $ins->execute([
                (int)$target['recipe_id'],
                (int)$target['product_id'],
                $target['recipe_name'],
                $target['notes'],
                json_encode($items)
            ]);
            $upd = $pdo->prepare('UPDATE recipes SET is_active = 0 WHERE recipe_id = ?');
            $upd->execute([(int)$target['recipe_id']]);
            echo json_encode(['status' => 'success']);
            exit;
        } elseif ($action === 'restore_product') {
            $aid = isset($input['archive_id']) ? (int)$input['archive_id'] : 0;
            $pid = isset($input['product_id']) ? (int)$input['product_id'] : 0;
            if (!$pid && $aid) {
                $st = $pdo->prepare('SELECT product_id FROM product_archives WHERE archive_id = ? LIMIT 1');
                $st->execute([$aid]);
                $row = $st->fetch();
                $pid = $row ? (int)$row['product_id'] : 0;
            }
            if (!$pid) { http_response_code(422); echo json_encode(['error' => 'missing_identifier']); exit; }
            $upd = $pdo->prepare('UPDATE products SET is_active = 1 WHERE product_id = ?');
            $upd->execute([$pid]);
            echo json_encode(['status' => 'success']);
            exit;
        } elseif ($action === 'restore_ingredient') {
            $aid = isset($input['archive_id']) ? (int)$input['archive_id'] : 0;
            $iid = isset($input['ingredient_id']) ? (int)$input['ingredient_id'] : 0;
            if (!$iid && $aid) {
                $st = $pdo->prepare('SELECT ingredient_id FROM ingredient_archives WHERE archive_id = ? LIMIT 1');
                $st->execute([$aid]);
                $row = $st->fetch();
                $iid = $row ? (int)$row['ingredient_id'] : 0;
            }
            if (!$iid) { http_response_code(422); echo json_encode(['error' => 'missing_identifier']); exit; }
            $upd = $pdo->prepare('UPDATE ingredients SET is_active = 1 WHERE ingredient_id = ?');
            $upd->execute([$iid]);
            echo json_encode(['status' => 'success']);
            exit;
        } elseif ($action === 'restore_recipe') {
            $aid = isset($input['archive_id']) ? (int)$input['archive_id'] : 0;
            $rid = isset($input['recipe_id']) ? (int)$input['recipe_id'] : 0;
            if (!$rid && $aid) {
                $st = $pdo->prepare('SELECT recipe_id FROM recipe_archives WHERE archive_id = ? LIMIT 1');
                $st->execute([$aid]);
                $row = $st->fetch();
                $rid = $row ? (int)$row['recipe_id'] : 0;
            }
            if (!$rid) { http_response_code(422); echo json_encode(['error' => 'missing_identifier']); exit; }
            $upd = $pdo->prepare('UPDATE recipes SET is_active = 1 WHERE recipe_id = ?');
            $upd->execute([$rid]);
            echo json_encode(['status' => 'success']);
            exit;
        }
        elseif ($action === 'update_ingredient_stock') {
            $name = trim($input['name'] ?? '');
            $unit = trim($input['unit'] ?? '');
            $stock = (float)($input['stock'] ?? -1);
            if ($name === '' || $unit === '' || $stock < 0) { http_response_code(422); echo json_encode(['error' => 'invalid_parameters']); exit; }
            $s = $pdo->prepare('SELECT ingredient_id FROM ingredients WHERE name = ? AND unit = ? LIMIT 1');
            $s->execute([$name, $unit]);
            $row = $s->fetch();
            if (!$row) { http_response_code(404); echo json_encode(['error' => 'ingredient_not_found']); exit; }
            $iid = (int)$row['ingredient_id'];
            $upd = $pdo->prepare('UPDATE ingredients SET current_stock = ? WHERE ingredient_id = ?');
            $upd->execute([$stock, $iid]);
            echo json_encode(['status' => 'success']);
            exit;
        }
        elseif ($action === 'bulk_update_ingredients') {
            $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : [];
            if (empty($items)) { http_response_code(422); echo json_encode(['error' => 'invalid_parameters']); exit; }
            $pdo->beginTransaction();
            try {
                foreach ($items as $it) {
                    $name = trim($it['name'] ?? '');
                    $unit = trim($it['unit'] ?? '');
                    $stock = (float)($it['stock'] ?? -1);
                    if ($name === '' || $unit === '' || $stock < 0) { continue; }
                    $s = $pdo->prepare('SELECT ingredient_id FROM ingredients WHERE name = ? AND unit = ? LIMIT 1');
                    $s->execute([$name, $unit]);
                    $row = $s->fetch();
                    if ($row) {
                        $iid = (int)$row['ingredient_id'];
                        $upd = $pdo->prepare('UPDATE ingredients SET current_stock = ? WHERE ingredient_id = ?');
                        $upd->execute([$stock, $iid]);
                    } else {
                        $ins = $pdo->prepare('INSERT INTO ingredients (name, unit, current_stock, reorder_level, is_active) VALUES (?, ?, ?, 0, 1)');
                        $ins->execute([$name, $unit, $stock]);
                    }
                }
                $pdo->commit();
                echo json_encode(['status' => 'success']);
                exit;
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['error' => 'db_error']);
                exit;
            }
        }
        elseif ($action === 'save_recipe') {
            $productName = trim($input['product_name'] ?? '');
            $items = isset($input['items']) && is_array($input['items']) ? $input['items'] : [];
            if ($productName === '' || empty($items)) { http_response_code(422); echo json_encode(['error' => 'invalid_parameters']); exit; }
            $p = $pdo->prepare('SELECT product_id FROM products WHERE name = ? LIMIT 1');
            $p->execute([$productName]);
            $prow = $p->fetch();
            if (!$prow) { http_response_code(404); echo json_encode(['error' => 'product_not_found']); exit; }
            $pid = (int)$prow['product_id'];
            $pdo->beginTransaction();
            try {
                $r = $pdo->prepare('SELECT recipe_id FROM recipes WHERE product_id = ? AND is_active = 1 LIMIT 1');
                $r->execute([$pid]);
                $rrow = $r->fetch();
                if ($rrow) {
                    $rid = (int)$rrow['recipe_id'];
                    $pdo->prepare('DELETE FROM recipe_items WHERE recipe_id = ?')->execute([$rid]);
                } else {
                    $pdo->prepare('INSERT INTO recipes (product_id, recipe_name, notes, is_active) VALUES (?, ?, ?, 1)')->execute([$pid, $productName, '',]);
                    $rid = (int)$pdo->lastInsertId();
                }
                foreach ($items as $it) {
                    $ingName = trim($it['name'] ?? '');
                    $unit = trim($it['unit'] ?? '');
                    $qty = (float)($it['qty'] ?? 0);
                    if ($ingName === '' || $unit === '' || $qty <= 0) { continue; }
                    $si = $pdo->prepare('SELECT ingredient_id FROM ingredients WHERE name = ? AND unit = ? LIMIT 1');
                    $si->execute([$ingName, $unit]);
                    $irow = $si->fetch();
                    if ($irow) {
                        $iid = (int)$irow['ingredient_id'];
                    } else {
                        $pdo->prepare('INSERT INTO ingredients (name, unit, current_stock, reorder_level, is_active) VALUES (?, ?, 0, 0, 1)')->execute([$ingName, $unit]);
                        $iid = (int)$pdo->lastInsertId();
                    }
                    $pdo->prepare('INSERT INTO recipe_items (recipe_id, ingredient_id, quantity, unit, notes) VALUES (?, ?, ?, ?, ?)')->execute([$rid, $iid, $qty, $unit, '']);
                }
                $pdo->commit();
                echo json_encode(['status' => 'success']);
                exit;
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['error' => 'db_error']);
                exit;
            }
        }
        http_response_code(400);
        echo json_encode(['error' => 'unknown_action']);
        exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => 'db_error']);
        exit;
    }
}

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

$products_stmt = $pdo->query($products_query);
$products_rows = $products_stmt ? $products_stmt->fetchAll() : [];
$products_data = array_map(function($row) {
    return [
        'id' => ($row['client_product_id'] ?: ('#' . str_pad((int)$row['product_id'], 4, '0', STR_PAD_LEFT))),
        'product_id' => (int)$row['product_id'],
        'name' => $row['name'],
        'category' => ($row['category_slug'] ?: 'uncategorized'),
        'category_name' => ($row['category_name'] ?: 'Uncategorized'),
        'price' => (float)$row['selling_price'],
        'stock' => (int)$row['stock_quantity'],
        'reorder_level' => (int)$row['reorder_level'],
        'image_path' => $row['image_path']
    ];
}, $products_rows);

// Get summary statistics
$summary_query = "SELECT 
    COUNT(CASE WHEN p.stock_quantity > 0 THEN 1 END) as products_in_stock,
    COUNT(*) as total_items,
    COUNT(CASE WHEN (pc.slug IS NULL OR pc.slug NOT IN ('bubbletea','chicken')) AND p.stock_quantity > 0 AND p.stock_quantity <= p.reorder_level THEN 1 END) as low_stock,
    COUNT(CASE WHEN p.stock_quantity = 0 THEN 1 END) as out_of_stock,
    SUM(p.selling_price * p.stock_quantity) as total_value
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.category_id
WHERE p.is_active = 1 AND (pc.slug IS NULL OR pc.slug <> 'cups')";

$summary_stmt = $pdo->query($summary_query);
$summary_row = $summary_stmt ? $summary_stmt->fetch() : [];
$summary_data = [
    'productsInStock' => (int)($summary_row['products_in_stock'] ?? 0),
    'totalItems' => (int)($summary_row['total_items'] ?? 0),
    'lowStock' => (int)($summary_row['low_stock'] ?? 0),
    'outOfStock' => (int)($summary_row['out_of_stock'] ?? 0),
    'totalValue' => (float)($summary_row['total_value'] ?? 0)
];

// Get categories
$categories_query = "SELECT category_id, slug, name FROM product_categories ORDER BY name";
$categories_stmt = $pdo->query($categories_query);
$categories_rows = $categories_stmt ? $categories_stmt->fetchAll() : [];
$categories_data = array_map(function($row) {
    return [
        'id' => (int)$row['category_id'],
        'slug' => $row['slug'],
        'name' => $row['name']
    ];
}, $categories_rows);

// JSON API responses
if ((isset($_GET['format']) && $_GET['format'] === 'json') || isset($_GET['action'])) {
    header('Content-Type: application/json');
    $action = isset($_GET['action']) ? $_GET['action'] : 'all';
    switch ($action) {
        case 'summary':
            echo json_encode(['summary' => $summary_data]);
            break;
        case 'products':
            echo json_encode(['products' => $products_data]);
            break;
        case 'ingredients': {
            $stmt = $pdo->query('SELECT name, unit, current_stock, reorder_level FROM ingredients ORDER BY name');
            $rows = $stmt ? $stmt->fetchAll() : [];
            echo json_encode($rows);
            break;
        }
        case 'recipes': {
            $sql = 'SELECT p.name AS product_name, i.name AS ingredient_name, ri.unit, ri.quantity AS qty, r.notes
                    FROM recipes r
                    JOIN products p ON r.product_id = p.product_id
                    JOIN recipe_items ri ON ri.recipe_id = r.recipe_id
                    JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
                    ORDER BY p.name, i.name';
            $stmt = $pdo->query($sql);
            $rows = $stmt ? $stmt->fetchAll() : [];
            echo json_encode($rows);
            break;
        }
        case 'archives': {
            $type = isset($_GET['type']) ? $_GET['type'] : 'products';
            $q = isset($_GET['q']) ? trim($_GET['q']) : '';
            $from = isset($_GET['from']) ? $_GET['from'] : '';
            $to = isset($_GET['to']) ? $_GET['to'] : '';
            if ($type === 'products') {
                $sql = 'SELECT archive_id, product_id, client_product_id, name, category_slug, selling_price, stock_quantity, deleted_at FROM product_archives WHERE 1=1';
                $params = [];
                if ($q !== '') { $sql .= ' AND (name LIKE ? OR client_product_id LIKE ? OR product_id = ?)'; $params[] = "%$q%"; $params[] = "%$q%"; $params[] = is_numeric($q) ? (int)$q : 0; }
                if ($from !== '') { $sql .= ' AND deleted_at >= ?'; $params[] = $from; }
                if ($to !== '') { $sql .= ' AND deleted_at <= ?'; $params[] = $to; }
                $sql .= ' ORDER BY deleted_at DESC, archive_id DESC LIMIT 500';
                $st = $pdo->prepare($params ? $sql : str_replace(' WHERE 1=1', '', $sql));
                $st->execute($params);
                $rows = $st->fetchAll();
                echo json_encode(['type' => 'products', 'rows' => $rows]);
                break;
            } elseif ($type === 'ingredients') {
                $sql = 'SELECT archive_id, ingredient_id, name, unit, current_stock, storage_location, deleted_at FROM ingredient_archives WHERE 1=1';
                $params = [];
                if ($q !== '') { $sql .= ' AND (name LIKE ? OR ingredient_id = ?)'; $params[] = "%$q%"; $params[] = is_numeric($q) ? (int)$q : 0; }
                if ($from !== '') { $sql .= ' AND deleted_at >= ?'; $params[] = $from; }
                if ($to !== '') { $sql .= ' AND deleted_at <= ?'; $params[] = $to; }
                $sql .= ' ORDER BY deleted_at DESC, archive_id DESC LIMIT 500';
                $st = $pdo->prepare($params ? $sql : str_replace(' WHERE 1=1', '', $sql));
                $st->execute($params);
                $rows = $st->fetchAll();
                echo json_encode(['type' => 'ingredients', 'rows' => $rows]);
                break;
            } elseif ($type === 'recipes') {
                $sql = 'SELECT archive_id, recipe_id, product_id, recipe_name, notes, items_json, deleted_at FROM recipe_archives WHERE 1=1';
                $params = [];
                if ($q !== '') { $sql .= ' AND (recipe_name LIKE ? OR product_id = ? OR recipe_id = ?)'; $params[] = "%$q%"; $params[] = is_numeric($q) ? (int)$q : 0; $params[] = is_numeric($q) ? (int)$q : 0; }
                if ($from !== '') { $sql .= ' AND deleted_at >= ?'; $params[] = $from; }
                if ($to !== '') { $sql .= ' AND deleted_at <= ?'; $params[] = $to; }
                $sql .= ' ORDER BY deleted_at DESC, archive_id DESC LIMIT 500';
                $st = $pdo->prepare($params ? $sql : str_replace(' WHERE 1=1', '', $sql));
                $st->execute($params);
                $rows = $st->fetchAll();
                echo json_encode(['type' => 'recipes', 'rows' => $rows]);
                break;
            }
            echo json_encode(['type' => $type, 'rows' => []]);
            break;
        }
        case 'categories':
            echo json_encode(['categories' => $categories_data]);
            break;
        case 'all':
        default:
            echo json_encode([
                'summary' => $summary_data,
                'products' => $products_data,
                'categories' => $categories_data
            ]);
            break;
    }
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inventory - Bonbon Kitchen</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../dashboard.css">
    <link rel="stylesheet" href="../inventory.css">
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
                        <img src="../Bonbon Pics/Logo.png" alt="Logo">
                    </div>
                    <span class="user-name">BonBon Kitchen</span>
                </div>
            </header>

            <!-- Summary Cards -->
            <section class="inventory-summary">
                <div class="summary-card" id="productsInStockCard">
                    <div class="summary-header">
                        <h3 class="summary-title">Products in Stock</h3>
                        <span class="summary-icon"><i class="fas fa-box"></i></span>
                    </div>
                    <div class="summary-value" id="productsInStock">0</div>
                </div>

                <div class="summary-card" id="totalItemsCard">
                    <div class="summary-header">
                        <h3 class="summary-title">Total Items</h3>
                        <span class="summary-icon"><i class="fas fa-box"></i></span>
                    </div>
                    <div class="summary-value" id="totalItems">0</div>
                </div>

                <div class="summary-card" id="lowStockCard">
                    <div class="summary-header">
                        <h3 class="summary-title">Low Stock</h3>
                        <span class="summary-icon"><i class="fas fa-exclamation-triangle"></i></span>
                    </div>
                    <div class="summary-value" id="lowStock">0</div>
                </div>

                <div class="summary-card" id="outOfStockCard">
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
                    <input type="text" id="productNameInput" class="form-input" placeholder="e.g. Cup" required>
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

    <div class="modal-overlay" id="confirmModal">
        <div class="modal-content confirm-modal">
            <div class="modal-header">
                <h3><i class="fas fa-question-circle"></i> Confirm Action</h3>
                <button class="close-btn" id="closeConfirmBtn"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p id="confirmMessage"></p>
                <div class="modal-actions" style="display:flex;justify-content:center;gap:12px;">
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
                <div class="modal-actions" style="display:flex;justify-content:center;gap:12px;">
                    <button class="primary-btn" id="noticeOkBtn">OK</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="ingredientModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="ingredientModalTitle"><i class="fas fa-tools"></i> Manage Ingredient Stock</h3>
                <button class="close-btn" id="closeIngredientModalBtn"><i class="fas fa-times"></i></button>
            </div>
            <form class="modal-body" id="ingredientForm">
                <div id="ingredientFormBody"></div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn" id="cancelIngredientModalBtn">Cancel</button>
                    <button type="submit" class="save-btn">Save</button>
                </div>
            </form>
        </div>
    </div>

    <div id="toastContainer" class="toast-container"></div>

    <script>
        // Pass PHP data to JavaScript
        window.productsData = <?php echo json_encode($products_data); ?>;
        window.summaryData = <?php echo json_encode($summary_data); ?>;
        window.categoriesData = <?php echo json_encode($categories_data); ?>;
        
        console.log('Products loaded from database:', window.productsData.length);
        console.log('Summary data:', window.summaryData);
        console.log('Categories loaded:', window.categoriesData.length);
    </script>
    <script src="../user-profile.js"></script>
    <script src="../inventory.js"></script>
</body>
</html>
// Handle write actions via POST JSON

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $input = json_decode(file_get_contents('php://input'), true);
    $action = isset($input['action']) ? $input['action'] : '';

    $ok = function($data) { echo json_encode($data); exit; };
    $err = function($code, $http = 400) { http_response_code($http); echo json_encode(['error' => $code]); exit; };

    $getCategoryIdBySlug = function(PDO $pdo, $slug) {
        $stmt = $pdo->prepare('SELECT category_id FROM product_categories WHERE slug = ? LIMIT 1');
        $stmt->execute([$slug]);
        $row = $stmt->fetch();
        return $row ? (int)$row['category_id'] : null;
    };

    switch ($action) {
        case 'add_product': {
            $id = trim($input['id'] ?? '');
            $name = trim($input['name'] ?? '');
            $slug = trim($input['category'] ?? '');
            $price = (float)($input['price'] ?? 0);
            $stock = (int)($input['stock'] ?? 0);
            if ($name === '' || $slug === '' || $price < 0 || $stock < 0) $err('invalid_parameters');
            $catId = $getCategoryIdBySlug($pdo, $slug);
            if ($catId === null) $err('category_not_found');
            $stmt = $pdo->prepare('INSERT INTO products (client_product_id, name, selling_price, stock_quantity, reorder_level, is_active, image_path, category_id) VALUES (?, ?, ?, ?, ?, 1, NULL, ?)');
            $reorder = (int)($input['reorder_level'] ?? 0);
            $stmt->execute([$id ?: null, $name, $price, $stock, $reorder, $catId]);
            $pid = (int)$pdo->lastInsertId();
            $ok(['status' => 'success', 'product_id' => $pid]);
        } break;
        case 'update_product': {
            $id = trim($input['id'] ?? '');
            $name = trim($input['name'] ?? '');
            $slug = trim($input['category'] ?? '');
            $price = (float)($input['price'] ?? 0);
            $stock = (int)($input['stock'] ?? 0);
            if ($name === '' || $slug === '' || $price < 0 || $stock < 0) $err('invalid_parameters');
            $catId = $getCategoryIdBySlug($pdo, $slug);
            if ($catId === null) $err('category_not_found');
            // Update by client_product_id or by name
            $stmt = $pdo->prepare('UPDATE products SET name = ?, selling_price = ?, stock_quantity = ?, category_id = ? WHERE client_product_id = ? OR name = ?');
            $stmt->execute([$name, $price, $stock, $catId, $id, $name]);
            $ok(['status' => 'success']);
        } break;
        case 'delete_product': {
            $id = trim($input['id'] ?? '');
            $name = trim($input['name'] ?? '');
            if ($id === '' && $name === '') $err('invalid_parameters');
            $target = null;
            if ($id !== '') {
                $s = $pdo->prepare('SELECT p.*, pc.slug AS category_slug FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.category_id WHERE p.client_product_id = ? LIMIT 1');
                $s->execute([$id]);
                $target = $s->fetch();
            }
            if (!$target && $name !== '') {
                $s2 = $pdo->prepare('SELECT p.*, pc.slug AS category_slug FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.category_id WHERE p.name = ? LIMIT 1');
                $s2->execute([$name]);
                $target = $s2->fetch();
            }
            if (!$target) $err('product_not_found', 404);
            $pdo->exec("CREATE TABLE IF NOT EXISTS product_archives (
                archive_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                product_id INT UNSIGNED,
                client_product_id VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                category_id INT UNSIGNED NULL,
                category_slug VARCHAR(255) NULL,
                selling_price DECIMAL(10,4) DEFAULT 0,
                stock_quantity INT DEFAULT 0,
                deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (archive_id),
                KEY idx_product_archives_product (product_id),
                KEY idx_product_archives_name (name)
            ) ENGINE=InnoDB");
            $ins = $pdo->prepare('INSERT INTO product_archives (product_id, client_product_id, name, category_id, category_slug, selling_price, stock_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $ins->execute([
                (int)$target['product_id'],
                $target['client_product_id'],
                $target['name'],
                $target['category_id'],
                $target['category_slug'],
                (float)$target['selling_price'],
                (int)$target['stock_quantity']
            ]);
            $upd = $pdo->prepare('UPDATE products SET is_active = 0 WHERE product_id = ?');
            $upd->execute([(int)$target['product_id']]);
            $ok(['status' => 'success']);
        } break;
        case 'restore_product': {
            $aid = isset($input['archive_id']) ? (int)$input['archive_id'] : 0;
            $pid = isset($input['product_id']) ? (int)$input['product_id'] : 0;
            if (!$pid && $aid) {
                $st = $pdo->prepare('SELECT product_id FROM product_archives WHERE archive_id = ? LIMIT 1');
                $st->execute([$aid]);
                $row = $st->fetch();
                $pid = $row ? (int)$row['product_id'] : 0;
            }
            if (!$pid) $err('missing_identifier');
            $upd = $pdo->prepare('UPDATE products SET is_active = 1 WHERE product_id = ?');
            $upd->execute([$pid]);
            $ok(['status' => 'success']);
        } break;
        case 'restore_ingredient': {
            $aid = isset($input['archive_id']) ? (int)$input['archive_id'] : 0;
            $iid = isset($input['ingredient_id']) ? (int)$input['ingredient_id'] : 0;
            if (!$iid && $aid) {
                $st = $pdo->prepare('SELECT ingredient_id FROM ingredient_archives WHERE archive_id = ? LIMIT 1');
                $st->execute([$aid]);
                $row = $st->fetch();
                $iid = $row ? (int)$row['ingredient_id'] : 0;
            }
            if (!$iid) $err('missing_identifier');
            $upd = $pdo->prepare('UPDATE ingredients SET is_active = 1 WHERE ingredient_id = ?');
            $upd->execute([$iid]);
            $ok(['status' => 'success']);
        } break;
        case 'restore_recipe': {
            $aid = isset($input['archive_id']) ? (int)$input['archive_id'] : 0;
            $rid = isset($input['recipe_id']) ? (int)$input['recipe_id'] : 0;
            if (!$rid && $aid) {
                $st = $pdo->prepare('SELECT recipe_id FROM recipe_archives WHERE archive_id = ? LIMIT 1');
                $st->execute([$aid]);
                $row = $st->fetch();
                $rid = $row ? (int)$row['recipe_id'] : 0;
            }
            if (!$rid) $err('missing_identifier');
            $upd = $pdo->prepare('UPDATE recipes SET is_active = 1 WHERE recipe_id = ?');
            $upd->execute([$rid]);
            $ok(['status' => 'success']);
        } break;
        default:
            $err('unknown_action');
    }
}
        case 'archives': {
            $type = isset($_GET['type']) ? $_GET['type'] : 'products';
            $q = isset($_GET['q']) ? trim($_GET['q']) : '';
            $from = isset($_GET['from']) ? $_GET['from'] : '';
            $to = isset($_GET['to']) ? $_GET['to'] : '';
            if ($type === 'products') {
                $sql = 'SELECT archive_id, product_id, client_product_id, name, category_slug, selling_price, stock_quantity, deleted_at FROM product_archives WHERE 1=1';
                $params = [];
                if ($q !== '') { $sql .= ' AND (name LIKE ? OR client_product_id LIKE ? OR product_id = ?)'; $params[] = "%$q%"; $params[] = "%$q%"; $params[] = is_numeric($q) ? (int)$q : 0; }
                if ($from !== '') { $sql .= ' AND deleted_at >= ?'; $params[] = $from; }
                if ($to !== '') { $sql .= ' AND deleted_at <= ?'; $params[] = $to; }
                $sql .= ' ORDER BY deleted_at DESC, archive_id DESC LIMIT 500';
                $st = $pdo->prepare($params ? $sql : str_replace(' WHERE 1=1', '', $sql));
                $st->execute($params);
                $rows = $st->fetchAll();
                echo json_encode(['type' => 'products', 'rows' => $rows]);
                break;
            }
            echo json_encode(['type' => $type, 'rows' => []]);
            break;
        }
