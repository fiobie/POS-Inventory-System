<?php
//display logs in logs.html
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

$logFile = __DIR__ . '/product_edits.log';
$out = [];
if (is_readable($logFile)) {
    $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $lines = array_reverse($lines);
    foreach ($lines as $line) {
        $entry = json_decode($line, true);
        if (!$entry)
            continue;

        $userId = $entry['user_id'] ?? $entry['updatedBy'] ?? $entry['updated_by'] ?? null;
        $before = $entry['before'] ?? [];
        $after = $entry['after'] ?? [];
        $nameBefore = $before['name'] ?? null;
        $nameAfter = $after['name'] ?? null;

        $priceKeys = ['selling_price', 'price', 'cost_price'];
        $priceBefore = null;
        $priceAfter = null;
        foreach ($priceKeys as $k) {
            if (array_key_exists($k, $before) || array_key_exists($k, $after)) {
                $priceBefore = $before[$k] ?? null;
                $priceAfter = $after[$k] ?? null;
                break;
            }
        }

        $isAdd = false;
        $action = $entry['action'] ?? $entry['type'] ?? $entry['event'] ?? null;
        if (is_string($action)) {
            $actionLower = strtolower($action);
            if (strpos($actionLower, 'add') !== false || strpos($actionLower, 'create') !== false) {
                $isAdd = true;
            }
        }
        if (!$isAdd && empty($before) && !empty($after)) {
            $isAdd = true;
        }

        if ($isAdd) {
            $out[] = [
                'timestamp' => $entry['timestamp'] ?? $entry['time'] ?? null,
                'product_id' => $entry['product_id'] ?? $entry['productId'] ?? null,
                'user_id' => $userId,
                'name_before' => null,
                'name_after' => $after['name'] ?? null,
                'price_before' => null,
                'price_after' => $priceAfter,
                'action' => 'add',
            ];
            continue;
        }

        $changedRelevant = false;
        if (!empty($entry['changes']) && is_array($entry['changes'])) {
            foreach ($entry['changes'] as $c) {
                $field = $c['field'] ?? '';
                if ($field === 'name' || $field === 'selling_price' || $field === 'price') {
                    $changedRelevant = true;
                    break;
                }
            }
        }

        if (empty($entry['changes'])) {
            if ($nameBefore !== $nameAfter && ($nameBefore !== null || $nameAfter !== null))
                $changedRelevant = true;
            if ($priceBefore !== $priceAfter && ($priceBefore !== null || $priceAfter !== null))
                $changedRelevant = true;
        }

        if (!$changedRelevant)
            continue;

        $out[] = [
            'timestamp' => $entry['timestamp'] ?? $entry['time'] ?? null,
            'product_id' => $entry['product_id'] ?? $entry['productId'] ?? null,
            'user_id' => $userId,
            'name_before' => $nameBefore,
            'name_after' => $nameAfter,
            'price_before' => $priceBefore,
            'price_after' => $priceAfter,
            'action' => 'edit',
        ];
    }
}

echo json_encode($out);
