<?php
require __DIR__ . '/db.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $input = json_decode(file_get_contents('php://input'), true);
    $action = isset($input['action']) ? $input['action'] : '';
$ok = function($data) { echo json_encode($data); exit; };
$err = function($code, $http = 400, $extra = []) { http_response_code($http); echo json_encode(array_merge(['error' => $code], $extra)); exit; };
    $userId = 1;

    $ensureSettingsRow = function(PDO $pdo, $uid) {
        $chk = $pdo->prepare('SELECT settings_id FROM user_settings WHERE user_id = ? LIMIT 1');
        $chk->execute([$uid]);
        $row = $chk->fetch();
        if (!$row) {
            $ins = $pdo->prepare('INSERT INTO user_settings (user_id) VALUES (?)');
            $ins->execute([$uid]);
        }
    };

    switch ($action) {
        case 'get_settings': {
            $settingsStmt = $pdo->prepare('SELECT * FROM user_settings WHERE user_id = ? LIMIT 1');
            $settingsStmt->execute([$userId]);
            $s = $settingsStmt->fetch();
            if (!$s) { $ensureSettingsRow($pdo, $userId); $settingsStmt->execute([$userId]); $s = $settingsStmt->fetch(); }

            $profileStmt = $pdo->prepare('SELECT first_name, last_name, email, phone, avatar_url, last_login_at, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1');
            $profileStmt->execute([$userId]);
            $profile = $profileStmt->fetch() ?: [];

            $logsStmt = $pdo->prepare('SELECT l.status, l.ip_address, l.device_info, l.notes, l.logged_in_at, l.logged_out_at, u.email FROM user_access_logs l LEFT JOIN users u ON u.user_id = l.user_id WHERE l.user_id = ? ORDER BY l.log_id DESC LIMIT 200');
            $logsStmt->execute([$userId]);
            $logs = $logsStmt->fetchAll();
            $ok([
                'profile' => [
                    'firstName' => $profile['first_name'] ?? '',
                    'lastName' => $profile['last_name'] ?? '',
                    'email' => $profile['email'] ?? '',
                    'phone' => $profile['phone'] ?? '',
                    'avatarUrl' => $profile['avatar_url'] ?? null,
                ],
                'security' => [
                    'twoFactor' => (bool)($s['two_factor_enabled'] ?? 0),
                    'loginAlerts' => (bool)($s['login_alerts_enabled'] ?? 1),
                    'lastPasswordChange' => $s['last_password_change'] ?? null,
                ],
                'system' => [
                    'language' => $s['language_code'] ?? 'en',
                    'dateFormat' => $s['date_format'] ?? 'MM/DD/YYYY'
                ],
                'regional' => [
                    'timeFormat' => $s['time_format'] ?? '12h',
                    'timezone' => $s['timezone'] ?? 'Asia/Manila',
                    'currency' => $s['currency_code'] ?? 'PHP',
                    'numberFormat' => $s['number_format'] ?? '1,234.56'
                ],
                'preferences' => [
                    'notifications' => (bool)($s['notifications_enabled'] ?? 1),
                    'autoUpdate' => (bool)($s['auto_update_enabled'] ?? 1),
                    'dataSharing' => (bool)($s['data_sharing_opt_in'] ?? 0),
                    'theme' => $s['theme'] ?? 'system'
                ],
                'logs' => array_map(function($l) {
                    return [
                        'status' => $l['status'],
                        'email' => $l['email'] ?? null,
                        'ip' => $l['ip_address'],
                        'device' => $l['device_info'],
                        'notes' => $l['notes'],
                        'timestamp' => $l['logged_in_at'],
                        'loggedOutAt' => $l['logged_out_at']
                    ];
                }, $logs)
            ]);
        } break;
        case 'change_password': {
            $current = (string)($input['currentPassword'] ?? '');
            $next    = (string)($input['newPassword'] ?? '');
            if ($current === '' || $next === '') { $err('missing_password', 422); }
            if (strlen($next) < 8) { $err('weak_password', 422); }
            $userStmt = $pdo->prepare('SELECT password_hash FROM users WHERE user_id = ? LIMIT 1');
            $userStmt->execute([$userId]);
            $user = $userStmt->fetch();
            if (!$user || !password_verify($current, $user['password_hash'])) {
                $err('invalid_current_password', 422);
            }
            $hash = password_hash($next, PASSWORD_BCRYPT);
            $pdo->beginTransaction();
            try {
                $upd = $pdo->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?');
                $upd->execute([$hash, $userId]);
                $ensureSettingsRow($pdo, $userId);
                $updSettings = $pdo->prepare('UPDATE user_settings SET last_password_change = NOW() WHERE user_id = ?');
                $updSettings->execute([$userId]);
                $pdo->commit();
            } catch (Throwable $e) {
                $pdo->rollBack();
                $err('db_error', 500);
            }
            $ok(['status' => 'success', 'lastPasswordChange' => date('c')]);
        } break;
        case 'save_security_settings': {
            $twoFactor = !empty($input['twoFactor']) ? 1 : 0;
            $loginAlerts = !empty($input['loginAlerts']) ? 1 : 0;
            $ensureSettingsRow($pdo, $userId);
            $upd = $pdo->prepare('UPDATE user_settings SET two_factor_enabled = ?, login_alerts_enabled = ? WHERE user_id = ?');
            $upd->execute([$twoFactor, $loginAlerts, $userId]);
            $ok(['status' => 'success']);
        } break;
        case 'save_system_settings': {
            $lang = trim($input['language'] ?? 'en');
            $df = trim($input['dateFormat'] ?? 'MM/DD/YYYY');
            $isValidLang = (bool)preg_match('/^[a-z]{2,3}(-[A-Z]{2})?$/', $lang) || $lang === 'en-fil';
            $allowedDate = ['MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD','DD MMM YYYY','MMM DD, YYYY','YYYY/MM/DD','DD.MM.YYYY'];
            if (!$isValidLang) { $err('invalid_language', 422); }
            if (!in_array($df, $allowedDate, true)) { $err('invalid_date_format', 422); }
            $ensureSettingsRow($pdo, $userId);
            $upd = $pdo->prepare('UPDATE user_settings SET language_code = ?, date_format = ? WHERE user_id = ?');
            $upd->execute([$lang, $df, $userId]);
            $ok(['status' => 'success']);
        } break;
        case 'save_regional_settings': {
            $tf = trim($input['timeFormat'] ?? '12h');
            $tz = trim($input['timezone'] ?? 'Asia/Manila');
            $cc = trim($input['currency'] ?? 'PHP');
            $nf = trim($input['numberFormat'] ?? '1,234.56');
            $allowedTime = ['12h','24h'];
            $allTz = \DateTimeZone::listIdentifiers();
            $allowedCur = ['PHP','USD','EUR','GBP','JPY','CNY','KRW','AUD','CAD','INR','SGD','HKD','THB','IDR','MYR','CHF','SEK','NOK','DKK','RUB','BRL','ZAR','AED','SAR','TWD','NZD'];
            $allowedNum = ['1,234.56','1.234,56','1 234,56','1 234,56'];
            if (!in_array($tf, $allowedTime, true)) { $err('invalid_time_format', 422); }
            if (!in_array($tz, $allTz, true)) { $err('invalid_timezone', 422); }
            if (!in_array($cc, $allowedCur, true)) { $err('invalid_currency', 422); }
            if (!in_array($nf, $allowedNum, true)) { $err('invalid_number_format', 422); }
            $ensureSettingsRow($pdo, $userId);
            $upd = $pdo->prepare('UPDATE user_settings SET time_format = ?, timezone = ?, currency_code = ?, number_format = ? WHERE user_id = ?');
            $upd->execute([$tf, $tz, $cc, $nf, $userId]);
            $ok(['status' => 'success']);
        } break;
        case 'save_preferences': {
            $notif = !empty($input['notifications']) ? 1 : 0;
            $auto = !empty($input['autoUpdate']) ? 1 : 0;
            $share = !empty($input['dataSharing']) ? 1 : 0;
            $theme = trim($input['theme'] ?? 'system');
            $allowedTheme = ['system','light','dark'];
            if (!in_array($theme, $allowedTheme, true)) { $err('invalid_theme', 422); }
            $ensureSettingsRow($pdo, $userId);
            $upd = $pdo->prepare('UPDATE user_settings SET notifications_enabled = ?, auto_update_enabled = ?, data_sharing_opt_in = ?, theme = ? WHERE user_id = ?');
            $upd->execute([$notif, $auto, $share, $theme, $userId]);
            $ok(['status' => 'success']);
        } break;
        case 'save_profile': {
            $firstName = trim($input['firstName'] ?? '');
            $lastName  = trim($input['lastName'] ?? '');
            $email     = trim($input['email'] ?? '');
            $phone     = trim($input['phone'] ?? '');

            if ($firstName === '' || $lastName === '') {
                $err('invalid_name', 422);
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $err('invalid_email', 422);
            }

            // Profile Update Functionality
            $checkUser = $pdo->prepare('SELECT user_id FROM users WHERE user_id = ? LIMIT 1');
            $checkUser->execute([$userId]);

            if (!$checkUser->fetch()) {
                
                $insertUser = $pdo->prepare(
                    'INSERT INTO users (user_id, first_name, last_name, email, phone, password_hash, role, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                );
                $dummyPasswordHash = password_hash('Bonbon123!', PASSWORD_BCRYPT);
                $insertUser->execute([
                    $userId,
                    $firstName,
                    $lastName,
                    $email,
                    $phone,
                    $dummyPasswordHash,
                    'admin',
                    'active'
                ]);
            } else {
                // Later saves: only update the 4 profile fields
                $updateUser = $pdo->prepare(
                    'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE user_id = ?'
                );
                $updateUser->execute([$firstName, $lastName, $email, $phone, $userId]);
            }

            $ok(['status' => 'success']);
        } break;
        case 'get_logs': {
            $logsStmt = $pdo->prepare('SELECT l.status, l.ip_address, l.device_info, l.notes, l.logged_in_at, l.logged_out_at, u.email FROM user_access_logs l LEFT JOIN users u ON u.user_id = l.user_id WHERE l.user_id = ? ORDER BY l.log_id DESC LIMIT 200');
            $logsStmt->execute([$userId]);
            $logs = $logsStmt->fetchAll();
            $ok(['logs' => array_map(function($l) {
                return [
                    'status' => $l['status'],
                    'email' => $l['email'] ?? null,
                    'ip' => $l['ip_address'],
                    'device' => $l['device_info'],
                    'notes' => $l['notes'],
                    'timestamp' => $l['logged_in_at'],
                    'loggedOutAt' => $l['logged_out_at']
                ];
            }, $logs)]);
        } break;
        case 'add_demo_log': {
            $status = in_array(($input['status'] ?? 'success'), ['success','failed','terminated']) ? $input['status'] : 'success';
            $ip = $input['ip'] ?? '127.0.0.1';
            $device = $input['device'] ?? 'Windows • Edge';
            $notes = $input['notes'] ?? 'Demo log';
            $now = date('Y-m-d H:i:s');
            $stmt = $pdo->prepare('INSERT INTO user_access_logs (user_id, status, ip_address, device_info, notes, logged_in_at) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([$userId, $status, $ip, $device, $notes, $now]);
            $ok(['status' => 'success']);
        } break;
        default:
            $err('unknown_action');
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings - Bonbon Kitchen</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../dashboard.css">
    <link rel="stylesheet" href="../settings.css">
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
                <a href="pos.php" class="nav-item" data-page="pos">
                    <span class="nav-icon"><i class="fas fa-shopping-cart"></i></span>
                    <span class="nav-text">POS</span>
                </a>
                <a href="inventory.php" class="nav-item" data-page="inventory">
                    <span class="nav-icon"><i class="fas fa-box"></i></span>
                    <span class="nav-text">Inventory</span>
                </a>
                <a href="settings.php" class="nav-item active" data-page="settings">
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

        <main class="main-content settings-main">
            <header class="header">
                <button class="sidebar-toggle" id="sidebarToggle">
                    <i class="fas fa-bars"></i>
                </button>
                <h2 class="page-title">Settings</h2>
                <div class="user-profile">
                    <div class="user-icon">
                        <img src="../Bonbon Pics/Logo.png" alt="Logo" data-user-avatar data-default-avatar="../Bonbon Pics/Logo.png">
                    </div>
                    <span class="user-name" id="userNameDisplay" data-user-name>BonBon Kitchen</span>
                </div>
            </header>

            <section class="settings-tabs" role="tablist" aria-label="Settings tabs">
                <button class="tab-btn active" data-tab="profile" role="tab" aria-selected="true">Profile</button>
                <button class="tab-btn" data-tab="security" role="tab" aria-selected="false">Security</button>
                <button class="tab-btn" data-tab="logs" role="tab" aria-selected="false">Access Logs</button>
                <button class="tab-btn" data-tab="archives" role="tab" aria-selected="false">Archives</button>
                <button class="tab-btn" data-tab="preferences" role="tab" aria-selected="false">Settings</button>
            </section>

            <section class="tab-content active" id="profileTab" role="tabpanel">
                <div class="profile-layout">
                    <div class="profile-card">
                        <div class="profile-avatar">
                            <img src="https://placehold.co/120x120" alt="Profile" id="profileImagePreview">
                            <div class="profile-identity">
                                <h3 id="profileFullName">Bonbon User</h3>
                                <p id="profileEmailText">user@example.com</p>
                            </div>
                        </div>
                        <button class="ghost-btn" id="changePhotoBtn">
                            <i class="fas fa-camera"></i>
                            Change Profile Picture
                        </button>
                        <input type="file" id="profileImageInput" accept="image/*" hidden>
                        <p class="small-note">Use a square image for best results.</p>
                    </div>

                    <form class="profile-form" id="profileForm">
                        <div class="form-grid two-column">
                            <label class="form-field">
                                <span>First Name</span>
                                <input type="text" id="firstNameInput" required>
                            </label>
                            <label class="form-field">
                                <span>Last Name</span>
                                <input type="text" id="lastNameInput" required>
                            </label>
                            <label class="form-field">
                                <span>Email Address</span>
                                <input type="email" id="emailInput" required>
                            </label>
                            <label class="form-field">
                                <span>Phone Number</span>
                                <input type="tel" id="phoneInput" placeholder="+63 900 000 0000">
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="primary-btn">Save Changes</button>
                            <span class="form-feedback" id="profileFeedback"></span>
                        </div>
                    </form>
                </div>
            </section>

            <section class="tab-content" id="securityTab" role="tabpanel" aria-hidden="true">
                <div class="security-layout">
                    <div class="security-main">
                        <form class="card" id="securityForm">
                            <h3>Update Password</h3>
                            <div class="form-grid two-column">
                                <label class="form-field">
                                    <span>Current Password</span>
                                    <input type="password" id="currentPasswordInput" required>
                                </label>
                                <label class="form-field">
                                    <span>New Password</span>
                                    <input type="password" id="newPasswordInput" required>
                                </label>
                                <label class="form-field">
                                    <span>Confirm New Password</span>
                                    <input type="password" id="confirmPasswordInput" required>
                                </label>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="primary-btn">Update Password</button>
                                <span class="form-feedback" id="securityFeedback"></span>
                            </div>
                        </form>

                        <div class="card security-options">
                            <h3>Security Options</h3>
                            <label class="toggle-row">
                                <span>
                                    <strong>Two-Factor Authentication</strong>
                                    <small>Add a second step before logging in.</small>
                                </span>
                                <input type="checkbox" id="twoFactorToggle">
                            </label>
                            <label class="toggle-row">
                                <span>
                                    <strong>Login Alerts</strong>
                                    <small>Notify me about logins from new devices.</small>
                                </span>
                                <input type="checkbox" id="loginAlertsToggle">
                            </label>
                            <p class="small-note">Last password change: <span id="lastPasswordChange">Never</span></p>
                        </div>
                    </div>

                    <aside class="security-overview card">
                        <h3>Security Overview</h3>
                        <div class="overview-stats">
                            <div class="overview-tile">
                                <span class="tile-value" id="overviewSuccess">0</span>
                                <span class="tile-label">Successful Logins</span>
                            </div>
                            <div class="overview-tile">
                                <span class="tile-value" id="overviewFailed">0</span>
                                <span class="tile-label">Failed Attempts</span>
                            </div>
                        </div>
                        <div class="overview-last-login" id="lastLoginCard">
                            <h4>Last Login</h4>
                            <p class="last-login-date" id="lastLoginDate">No logins recorded</p>
                            <p class="last-login-ip">IP: <span id="lastLoginIp">—</span></p>
                        </div>
                        <div class="overview-alert" id="securityAlertBox">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p id="securityAlertText">No failed login attempts detected.</p>
                        </div>
                    </aside>
                </div>
            </section>

            <section class="tab-content" id="logsTab" role="tabpanel" aria-hidden="true">
                <div class="card logs-card full-width">
                    <div class="logs-header">
                        <div>
                            <h3>Recent Access Logs</h3>
                            <p class="logs-description">Track all login attempts, successful sessions, and remote logouts.</p>
                        </div>
                        <div class="logs-actions">
                            <button class="ghost-btn" id="refreshLogsBtn"><i class="fas fa-rotate"></i> Refresh</button>
                            <button class="ghost-btn" id="addDemoLogBtn"><i class="fas fa-plus"></i> Add Demo Log</button>
                        </div>
                    </div>
                    <div class="table-container">
                        <table class="logs-table">
                            <thead>
                                <tr>
                                    <th>Action</th>
                                    <th>Email</th>
                                    <th>Time Stamp</th>
                                    <th>IP Address</th>
                                    <th>Device</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="accessLogsBody"></tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section class="tab-content" id="archivesTab" role="tabpanel" aria-hidden="true">
                <div class="card full-width">
                    <div class="logs-header">
                        <div>
                            <h3>Archives</h3>
                            <p class="logs-description">Browse deleted items by type. Filter by date or search by name/ID.</p>
                        </div>
                        <div class="logs-actions"></div>
                    </div>
                    <div class="filters-row">
                        <select id="archivesTypeSelect" class="form-select">
                            <option value="products" selected>Products</option>
                            <option value="ingredients">Ingredients</option>
                            <option value="recipes">Recipes</option>
                            <option value="orders">Orders</option>
                        </select>
                        <input id="archivesSearchInput" class="form-input" type="text" placeholder="Search by name or ID">
                        <input id="archivesFromDate" class="form-input" type="date">
                        <input id="archivesToDate" class="form-input" type="date">
                    </div>
                    <div class="table-container">
                        <table class="logs-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Deleted At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="archivesTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section class="tab-content" id="preferencesTab" role="tabpanel" aria-hidden="true">
                <div class="settings-layout-grid">
                    <div class="settings-left-column">
                        <div class="card system-settings-card">
                            <div class="settings-header">
                                <i class="fas fa-cog"></i>
                                <h3>System Settings</h3>
                            </div>
                            <form id="systemSettingsForm">
                                <div class="settings-form-grid">
                                    <label class="form-field">
                                        <span>Language</span>
                                        <div class="select-wrapper">
                                            <select id="languageSelect" class="form-select">
                                                <option value="en">English</option>
                                                <option value="en-fil">English/Filipino</option>
                                                <option value="fil">Filipino</option>
                                            </select>
                                            <i class="fas fa-chevron-down select-icon"></i>
                                        </div>
                                    </label>
                                    <label class="form-field">
                                        <span>Date Format</span>
                                        <div class="select-wrapper">
                                            <select id="dateFormatSelect" class="form-select">
                                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                                <option value="DD MMM YYYY">DD MMM YYYY</option>
                                            </select>
                                            <i class="fas fa-chevron-down select-icon"></i>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="date-picker-section">
                                    <label class="form-field">
                                        <span>Select Date</span>
                                        <div class="date-input-wrapper">
                                            <button type="button" class="calendar-btn" id="calendarToggleBtn" title="Open Calendar" data-tooltip="Open calendar picker">
                                                <i class="fas fa-calendar-alt"></i>
                                            </button>
                                            <input type="date" id="datePickerInput" class="form-date-input" data-tooltip="Click to select a date">
                                        </div>
                                        <div class="date-preview">
                                            <small>Preview: <span id="datePreview">—</span></small>
                                        </div>
                                    </label>
                                </div>

                                <div class="settings-form-actions">
                                    <button type="submit" class="primary-btn save-settings-btn">
                                        <i class="fas fa-save"></i>
                                        Save Settings
                                    </button>
                                    <span class="form-feedback" id="systemSettingsFeedback"></span>
                                </div>
                            </form>
                        </div>

                        <div class="card about-app-card">
                            <h3>About App</h3>
                            <div class="about-app-content">
                                <div class="about-item">
                                    <span class="about-label">System Version:</span>
                                    <span class="about-value" id="systemVersion">1.2.3</span>
                                </div>
                                <div class="about-item">
                                    <span class="about-label">Developer:</span>
                                    <span class="about-value" id="developerName">Bonbon Kitchen Development Team</span>
                                </div>
                                <div class="about-item">
                                    <span class="about-label">Contact Support:</span>
                                    <span class="about-value">
                                        <a href="mailto:support@bonbonkitchen.com" class="support-link">support@bonbonkitchen.com</a>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="settings-right-column">
                        <div class="card additional-settings-card">
                            <div class="settings-header">
                                <i class="fas fa-clock"></i>
                                <h3>Time & Regional</h3>
                            </div>
                            <form id="regionalSettingsForm">
                                <div class="settings-form-fields">
                                    <label class="form-field">
                                        <span>Time Format</span>
                                        <div class="select-wrapper">
                                            <select id="timeFormatSelect" class="form-select">
                                                <option value="12h">12 Hour (AM/PM)</option>
                                                <option value="24h">24 Hour</option>
                                            </select>
                                            <i class="fas fa-chevron-down select-icon"></i>
                                        </div>
                                    </label>
                                    <label class="form-field">
                                        <span>Timezone</span>
                                        <div class="select-wrapper">
                                            <select id="timezoneSelect" class="form-select">
                                                <option value="Asia/Manila">Asia/Manila (PHT)</option>
                                                <option value="UTC">UTC</option>
                                                <option value="America/New_York">America/New_York (EST)</option>
                                                <option value="Europe/London">Europe/London (GMT)</option>
                                            </select>
                                            <i class="fas fa-chevron-down select-icon"></i>
                                        </div>
                                    </label>
                                    <label class="form-field">
                                        <span>Currency</span>
                                        <div class="select-wrapper">
                                            <select id="currencySelect" class="form-select">
                                                <option value="PHP">Philippine Peso (₱)</option>
                                                <option value="USD">US Dollar ($)</option>
                                                <option value="EUR">Euro (€)</option>
                                                <option value="GBP">British Pound (£)</option>
                                            </select>
                                            <i class="fas fa-chevron-down select-icon"></i>
                                        </div>
                                    </label>
                                    <label class="form-field">
                                        <span>Number Format</span>
                                        <div class="select-wrapper">
                                            <select id="numberFormatSelect" class="form-select">
                                                <option value="1,234.56">1,234.56 (US)</option>
                                                <option value="1.234,56">1.234,56 (EU)</option>
                                                <option value="1 234,56">1 234,56 (FR)</option>
                                            </select>
                                            <i class="fas fa-chevron-down select-icon"></i>
                                        </div>
                                    </label>
                                </div>
                                <div class="settings-form-actions">
                                    <button type="submit" class="primary-btn save-settings-btn">
                                        <i class="fas fa-save"></i>
                                        Save Regional Settings
                                    </button>
                                    <span class="form-feedback" id="regionalSettingsFeedback"></span>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <script src="../core/utils.js"></script>
    <script src="../core/sidebar-manager.js"></script>
    <script src="../user-profile.js"></script>
    <script src="../settings.js"></script>
</body>
</html>
