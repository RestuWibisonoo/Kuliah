public class Main {
    public static void main(String[] args) {
        // Membuat objek dari kelas turunan Produk
        Produk elektronik = new Elektronik("Laptop", 15000000, 2);
        Produk makanan = new Makanan("Roti", 15000, new Date());

        // Membuat objek dari kelas turunan Pegawai
        Pegawai pegawaiTetap = new PegawaiTetap("Budi", 5000000, 1000000);
        Pegawai pegawaiKontrak = new PegawaiKontrak("Siti", 3000000, 12);

        // Menggunakan referensi induk untuk memanggil metode dari masing-masing objek kelas turunan
        elektronik.tampilkanInfo();
        System.out.println();
        makanan.tampilkanInfo();
        System.out.println();
        pegawaiTetap.tampilkanInfo();
        System.out.println();
        pegawaiKontrak.tampilkanInfo();
    }
}