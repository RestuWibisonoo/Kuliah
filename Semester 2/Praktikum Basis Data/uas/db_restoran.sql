-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 06 Jun 2024 pada 09.59
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_restoran`
--

DELIMITER $$
--
-- Prosedur
--
CREATE DEFINER=`'root'`@`'localhost'` PROCEDURE `gettransaksi` (IN `id_customer` VARCHAR(255))   BEGIN
    SELECT 
        transaksi.Id_transaksi,
        transaksi.Tgl_pesan,
        customer.nm_customer,
        makanan.nm_makanan,
        transaksi.Jmlh_makanan,
        makanan.Harga_makanan,
        minuman.nm_minuman,
        minuman.Harga_minuman,
        transaksi.Jmlh_minuman,
        transaksi.Ttl_harga,
        transaksi.Alamat_tujuan
    FROM 
        Transaksi 
    LEFT JOIN customer ON transaksi.id_customer = customer.id_customer 
    LEFT JOIN Makanan ON transaksi.id_makanan = makanan.id_makanan
    LEFT JOIN Minuman ON transaksi.id_minuman = minuman.id_minuman
    WHERE 
        transaksi.id_customer = id_customer;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `customer`
--

CREATE TABLE `customer` (
  `id_customer` int(11) NOT NULL,
  `nm_customer` varchar(100) DEFAULT NULL,
  `alamat_customer` text DEFAULT NULL,
  `kota` varchar(100) DEFAULT NULL,
  `no_tlp` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `customer`
--

INSERT INTO `customer` (`id_customer`, `nm_customer`, `alamat_customer`, `kota`, `no_tlp`, `email`) VALUES
(1, 'Fadzil Knalpot', 'Jl. Pakistan', 'Pakis', '0863473655839', 'fadzil@gmail.com'),
(2, 'Restu Rimba', 'Jl. Terindah', 'Hirosima', '086463857104', 'restu@gmail.com'),
(3, 'Rio IAN', 'Jl. Yokyakarta', 'Nagasaki', '086274839234', 'rio@gmail.com');

-- --------------------------------------------------------

--
-- Struktur dari tabel `makanan`
--

CREATE TABLE `makanan` (
  `id_makanan` int(11) NOT NULL,
  `id_supplier` int(11) DEFAULT NULL,
  `nm_makanan` varchar(100) DEFAULT NULL,
  `harga_makanan` int(11) DEFAULT NULL,
  `stok_makanan` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `makanan`
--

INSERT INTO `makanan` (`id_makanan`, `id_supplier`, `nm_makanan`, `harga_makanan`, `stok_makanan`) VALUES
(1, 1, 'Keong Racun', 25000, 999),
(2, 2, 'Nasi Cepit', 10000, 500),
(3, 3, 'Pasar Ijo', 50000, 7500);

-- --------------------------------------------------------

--
-- Struktur dari tabel `minuman`
--

CREATE TABLE `minuman` (
  `id_minuman` int(11) NOT NULL,
  `id_supplier` int(11) DEFAULT NULL,
  `nm_minuman` varchar(100) DEFAULT NULL,
  `harga_minuman` int(11) DEFAULT NULL,
  `stok_minuman` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `minuman`
--

INSERT INTO `minuman` (`id_minuman`, `id_supplier`, `nm_minuman`, `harga_minuman`, `stok_minuman`) VALUES
(1, 1, 'Comberan', 3000, 1000000),
(2, 2, 'Nutrisari', 5000, 100),
(3, 3, 'Cokolatos', 1000, 499);

--
-- Trigger `minuman`
--
DELIMITER $$
CREATE TRIGGER `kurangi_minuman` AFTER INSERT ON `minuman` FOR EACH ROW BEGIN
    UPDATE Minuman
    SET stok_minuman = stok_minuman - NEW.stok_minuman
    WHERE id_minuman = NEW.id_minuman;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `supplier`
--

CREATE TABLE `supplier` (
  `id_supplier` int(11) NOT NULL,
  `nm_supplier` varchar(100) DEFAULT NULL,
  `alamat_supplier` text DEFAULT NULL,
  `kota_supplier` varchar(100) DEFAULT NULL,
  `no_tlp_supplier` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `supplier`
--

INSERT INTO `supplier` (`id_supplier`, `nm_supplier`, `alamat_supplier`, `kota_supplier`, `no_tlp_supplier`) VALUES
(1, 'Supplier Tara', 'Jl. Rejosari', 'Pakistan', '0824632472734'),
(2, 'Supplier Slamet', 'Jl. Candi Umbul', 'Hokaido', '083423424873'),
(3, 'Supplier Agus', 'Jl. Kudus', 'Kretek', '086475847123');

-- --------------------------------------------------------

--
-- Struktur dari tabel `transaksi`
--

CREATE TABLE `transaksi` (
  `id_transaksi` int(11) NOT NULL,
  `id_customer` int(11) DEFAULT NULL,
  `id_makanan` int(11) DEFAULT NULL,
  `id_minuman` int(11) DEFAULT NULL,
  `jmlh_makanan` int(11) DEFAULT NULL,
  `jmlh_minuman` int(11) DEFAULT NULL,
  `ttl_harga` decimal(10,2) DEFAULT NULL,
  `tgl_pesan` date DEFAULT NULL,
  `tgl_kirim` date DEFAULT NULL,
  `alamat_tujuan` text DEFAULT NULL,
  `kota_tujuan` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `transaksi`
--

INSERT INTO `transaksi` (`id_transaksi`, `id_customer`, `id_makanan`, `id_minuman`, `jmlh_makanan`, `jmlh_minuman`, `ttl_harga`, `tgl_pesan`, `tgl_kirim`, `alamat_tujuan`, `kota_tujuan`) VALUES
(1, 1, 1, 3, 1, 1, 20000.00, '2024-06-06', '2024-06-06', 'Jl. Pakistan', 'Pakis');

--
-- Trigger `transaksi`
--
DELIMITER $$
CREATE TRIGGER `kurangi_transaksi` AFTER INSERT ON `transaksi` FOR EACH ROW BEGIN
    UPDATE Makanan
    SET stok_makanan = stok_makanan - NEW.jmlh_makanan
    WHERE id_makanan = NEW.id_makanan;

    UPDATE Minuman
    SET stok_minuman = stok_minuman - NEW.jmlh_minuman
    WHERE id_minuman = NEW.id_minuman;
END
$$
DELIMITER ;

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `customer`
--
ALTER TABLE `customer`
  ADD PRIMARY KEY (`id_customer`);

--
-- Indeks untuk tabel `makanan`
--
ALTER TABLE `makanan`
  ADD PRIMARY KEY (`id_makanan`),
  ADD KEY `id_supplier` (`id_supplier`);

--
-- Indeks untuk tabel `minuman`
--
ALTER TABLE `minuman`
  ADD PRIMARY KEY (`id_minuman`),
  ADD KEY `id_supplier` (`id_supplier`);

--
-- Indeks untuk tabel `supplier`
--
ALTER TABLE `supplier`
  ADD PRIMARY KEY (`id_supplier`);

--
-- Indeks untuk tabel `transaksi`
--
ALTER TABLE `transaksi`
  ADD PRIMARY KEY (`id_transaksi`),
  ADD KEY `id_customer` (`id_customer`),
  ADD KEY `id_makanan` (`id_makanan`),
  ADD KEY `id_minuman` (`id_minuman`);

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `makanan`
--
ALTER TABLE `makanan`
  ADD CONSTRAINT `makanan_ibfk_1` FOREIGN KEY (`id_supplier`) REFERENCES `supplier` (`id_supplier`);

--
-- Ketidakleluasaan untuk tabel `minuman`
--
ALTER TABLE `minuman`
  ADD CONSTRAINT `minuman_ibfk_1` FOREIGN KEY (`id_supplier`) REFERENCES `supplier` (`id_supplier`);

--
-- Ketidakleluasaan untuk tabel `transaksi`
--
ALTER TABLE `transaksi`
  ADD CONSTRAINT `transaksi_ibfk_1` FOREIGN KEY (`id_customer`) REFERENCES `customer` (`id_customer`),
  ADD CONSTRAINT `transaksi_ibfk_2` FOREIGN KEY (`id_makanan`) REFERENCES `makanan` (`id_makanan`),
  ADD CONSTRAINT `transaksi_ibfk_3` FOREIGN KEY (`id_minuman`) REFERENCES `minuman` (`id_minuman`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
