<?php
include 'koneksi.php';
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Form Postingan</title>
</head>
<body>
    <h1>Tambah Postingan Baru</h1>
    <form action="proses-postingan.php" method="POST">
        <label for="user">Nama Pengguna:</label>
        <input type="text" name="user" id="user" required><br><br>
        
        <label for="judul">Judul:</label>
        <input type="text" name="judul" id="judul" required><br><br>
        
        <label for="postingan">Isi Postingan:</label><br>
        <textarea name="postingan" id="postingan" rows="5" required></textarea><br><br>
        
        <button type="submit">Kirim Postingan</button>
    </form>
</body>
</html>
