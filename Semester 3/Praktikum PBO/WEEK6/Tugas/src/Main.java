public class Main {
    public static void main(String[] args) throws Exception {
        KeranjangBelanja keranjang = new KeranjangBelanja();

        Produk buku = new Buku("Novel", 50000);
        Produk elektronik = new Elektronik("Laptop", 10000000);
        Produk pakaian = new Pakaian("T-shirt", 100000);

        keranjang.tambahProduk(buku);
        keranjang.tambahProduk(elektronik);
        keranjang.tambahProduk(pakaian);

        System.out.println("Total harga setelah diskon: " + keranjang.hitungTotalHarga());
    }
}
