<?php
$host = "localhost";
$user = "root";
$password = "";
$dbname = "bonbon_posandinventory_db";
$port = 8080;

try {
    $conn = new mysqli($host, $user, $password, $dbname, port: $port);
    
    // Check connection
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
} catch (Exception $e) {
    die("Connection failed: " . $e->getMessage());
}
?>