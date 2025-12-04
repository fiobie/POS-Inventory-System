<?php
declare(strict_types=1);

header('Content-Type: application/json');

require __DIR__ . '/db.php';

// Helpers
$ok = function (array $data): void {
    echo json_encode($data);
    exit;
};

$err = function (string $code, int $http = 400, array $extra = []): void {
    http_response_code($http);
    echo json_encode(array_merge(['status' => 'error', 'message' => $code], $extra));
    exit;
};

$clientIp = function (): string {
    foreach (['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'] as $key) {
        if (!empty($_SERVER[$key])) {
            $value = $_SERVER[$key];
            // For X_FORWARDED_FOR the first entry is the originating IP
            if (strpos($value, ',') !== false) {
                $value = trim(explode(',', $value)[0]);
            }
            return $value;
        }
    }
    return '0.0.0.0';
};

$clientDevice = function (): string {
    return substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown device', 0, 120);
};

$logAccess = function (PDO $pdo, int $userId, string $status, string $notes = '', ?string $ip = null, ?string $device = null): void {
    if (!in_array($status, ['success', 'failed', 'terminated'], true)) {
        $status = 'success';
    }
    $stmt = $pdo->prepare('INSERT INTO user_access_logs (user_id, status, ip_address, device_info, notes, logged_in_at, logged_out_at) VALUES (?, ?, ?, ?, ?, NOW(), NULL)');
    $stmt->execute([
        $userId,
        $status,
        $ip ?? '0.0.0.0',
        $device ?? 'Unknown device',
        $notes
    ]);
};

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $err('method_not_allowed', 405);
}

$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $input['action'] ?? '';

if (!is_string($action) || $action === '') {
    $err('missing_action', 422);
}

switch ($action) {
    case 'signup': {
        $first = trim((string)($input['firstName'] ?? ''));
        $last  = trim((string)($input['lastName'] ?? ''));
        $email = trim((string)($input['email'] ?? ''));
        $pass  = (string)($input['password'] ?? '');

        if ($first === '' || $last === '') {
            $err('Please enter your name', 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $err('Please enter a valid email address', 422);
        }
        if (strlen($pass) < 6) {
            $err('Password must be at least 6 characters', 422);
        }

        // Check if email is already used
        $check = $pdo->prepare('SELECT user_id FROM users WHERE email = ? LIMIT 1');
        $check->execute([$email]);
        if ($check->fetch()) {
            $err('An account with this email already exists', 409);
        }

        $hash = password_hash($pass, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare(
            'INSERT INTO users (first_name, last_name, email, password_hash, role, status)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$first, $last, $email, $hash, 'staff', 'active']);

        $userId = (int)$pdo->lastInsertId();

        $ok([
            'status'   => 'success',
            'user_id'  => $userId,
            'email'    => $email,
            'fullName' => $first . ' ' . $last,
        ]);
    } break;

    case 'login': {
        $email = trim((string)($input['email'] ?? ''));
        $pass  = (string)($input['password'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $err('Please enter a valid email address', 422);
        }
        if ($pass === '') {
            $err('Please enter your password', 422);
        }

        $stmt = $pdo->prepare('SELECT user_id, first_name, last_name, password_hash, status FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($pass, (string)$user['password_hash'])) {
            if ($user && isset($user['user_id'])) {
                $logAccess($pdo, (int)$user['user_id'], 'failed', 'Invalid credentials', $clientIp(), $clientDevice());
            }
            $err('Invalid email or password', 401);
        }

        if (($user['status'] ?? 'active') !== 'active') {
            $err('This account is disabled', 403);
        }

        // Update last_login_at
        $upd = $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE user_id = ?');
        $upd->execute([(int)$user['user_id']]);

        $logAccess($pdo, (int)$user['user_id'], 'success', 'User login', $clientIp(), $clientDevice());

        $ok([
            'status'   => 'success',
            'user_id'  => (int)$user['user_id'],
            'email'    => $email,
            'fullName' => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')),
        ]);
    } break;

    case 'forgot_password': {
        $email = trim((string)($input['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $err('Please enter a valid email address', 422);
        }

        // We pretend to send an email and always succeed for UX simplicity.
        // Optionally you could store a code in DB here.
        $ok([
            'status' => 'success',
            'email'  => $email,
            'info'   => 'Verification code would be sent to this email in a real system.',
        ]);
    } break;

    case 'verify_code': {
        // Frontend already lets you continue even without a real code – we accept any code here.
        $email = trim((string)($input['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $err('Please enter a valid email address', 422);
        }

        $ok([
            'status' => 'success',
            'email'  => $email,
        ]);
    } break;

    case 'reset_password': {
        $email   = trim((string)($input['email'] ?? ''));
        $newPass = (string)($input['newPassword'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $err('Please enter a valid email address', 422);
        }
        if (strlen($newPass) < 6) {
            $err('Password must be at least 6 characters', 422);
        }

        $stmt = $pdo->prepare('SELECT user_id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user) {
            $err('No account found for this email', 404);
        }

        $hash = password_hash($newPass, PASSWORD_BCRYPT);
        $pdo->beginTransaction();
        try {
            $upd  = $pdo->prepare('UPDATE users SET password_hash = ?, last_login_at = NULL WHERE user_id = ?');
            $upd->execute([$hash, (int)$user['user_id']]);
            $updSettings = $pdo->prepare('UPDATE user_settings SET last_password_change = NOW() WHERE user_id = ?');
            $updSettings->execute([(int)$user['user_id']]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            $err('db_error', 500);
        }

        $ok([
            'status'  => 'success',
            'message' => 'Password updated successfully',
        ]);
    } break;

    case 'logout': {
        $userId = isset($input['userId']) ? (int)$input['userId'] : 0;
        if ($userId <= 0) {
            $err('missing_user', 422);
        }
        $ip = $clientIp();
        $device = $clientDevice();
        $upd = $pdo->prepare('UPDATE user_access_logs SET status = "terminated", logged_out_at = NOW() WHERE user_id = ? AND status = "success" AND logged_out_at IS NULL ORDER BY log_id DESC LIMIT 1');
        $upd->execute([$userId]);
        if ($upd->rowCount() === 0) {
            $stmt = $pdo->prepare('INSERT INTO user_access_logs (user_id, status, ip_address, device_info, notes, logged_in_at, logged_out_at) VALUES (?, "terminated", ?, ?, ?, NOW(), NOW())');
            $stmt->execute([$userId, $ip, $device, 'Manual logout']);
        }
        $ok(['status' => 'success']);
    } break;

    default:
        $err('unknown_action', 400);
}


