import java.util.ArrayList;
import java.util.List;

class KeranjangBelanja {
    private List<Produk> daftarProduk;

    public KeranjangBelanja() {
        daftarProduk = new ArrayList<>();
    }

    public void tambahProduk(Produk produk) {
        daftarProduk.add(produk);
    }

    public double hitungTotalHarga() {
        double total = 0;
        for (Produk produk : daftarProduk) {
            total += produk.getHarga() - produk.hitungDiskon(); // calculate price after discount
        }
        return total;
    }
}
