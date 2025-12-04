<?php
require __DIR__ . '/db.php';

header('Content-Type: application/json');

$userId = 1; // Example user ID, replace with dynamic value if needed

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'no_file_uploaded']);
    exit;
}

$file = $_FILES['avatar'];

// Basic validation: allow only specific image types
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);
$allowed = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
    'image/webp' => 'webp'
];

if (!isset($allowed[$mimeType])) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_file_type']);
    exit;
}

$ext = $allowed[$mimeType];

// Store under "BonBon Pics" folder at the same level as this script
$uploadDir = __DIR__ . '/BonBon Pics';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0775, true);
}

// Create a unique file name
$fileName = 'user_' . $userId . '_' . time() . '.' . $ext;
$destPath = $uploadDir . '/' . $fileName;

// Move the uploaded file
if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'upload_failed']);
    exit;
}

// Store relative path for frontend use
$relativePath = 'BonBon Pics/' . $fileName;

// Update user's avatar in the database
$stmt = $pdo->prepare('UPDATE users SET avatar_url = ? WHERE user_id = ?');
if ($stmt->execute([$relativePath, $userId])) {
    echo json_encode([
        'status' => 'success',
        'avatarUrl' => $relativePath
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'db_update_failed']);
}
