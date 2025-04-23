<?php
include 'koneksi.php';

$query = "SELECT * FROM postingan ORDER BY id DESC";
$result = mysqli_query($koneksi, $query);
?>

<!DOCTYPE html>
<html>
<head>
    <title>Postingan</title>
    <style>
        .container {
            width: 90%;
            margin: 20px auto;
        }
        
        .post-box {
            border: 1px solid #ddd;
            padding: 15px;
            margin-bottom: 10px;
        }
        
        .user {
            font-weight: bold;
            color: #333;
        }
        
        .judul {
            color: #666;
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Postingan</h2>
        
        <?php if (mysqli_num_rows($result) > 0): ?>
            <?php while ($row = mysqli_fetch_assoc($result)): ?>
                <div class="post-box">
                    <div class="user"><?php echo htmlspecialchars($row['user']); ?></div>
                    <div class="judul"><?php echo htmlspecialchars($row['judul']); ?></div>
                    <div class="isi"><?php echo nl2br(htmlspecialchars($row['postingan'])); ?></div>
                </div>
            <?php endwhile; ?>
        <?php else: ?>
            <div class="post-box" style="text-align:center; color:#777">
                Tidak ada postingan
            </div>
        <?php endif; ?>
    </div>
</body>
</html>

<?php
mysqli_close($koneksi);
?>