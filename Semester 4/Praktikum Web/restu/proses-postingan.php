<?php
include 'koneksi.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user = mysqli_real_escape_string($koneksi, $_POST['user']);
    $judul = mysqli_real_escape_string($koneksi, $_POST['judul']);
    $postingan = mysqli_real_escape_string($koneksi, $_POST['postingan']);

    if (empty($user) || empty($judul) || empty($postingan)) {
        echo "Semua field harus diisi!";
    } else {
        $query = "INSERT INTO postingan (user, judul, postingan) VALUES ('$user', '$judul', '$postingan')";

        if (mysqli_query($koneksi, $query)) {
            echo "Postingan berhasil ditambahkan!";
        } else {
            echo "Terjadi kesalahan: " . mysqli_error($koneksi);
        }
    }
}

mysqli_close($koneksi);
?>
