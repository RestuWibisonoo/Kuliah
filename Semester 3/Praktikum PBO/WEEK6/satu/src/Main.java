public class Main {
    public static void main(String[] args) throws Exception {
        KeranjangBelanja keranjang = new KeranjangBelanja();

        Produk buku = new Buku("Manga Naruto", 50000);
        Produk elektronik = new Elektronik("Mini PC ROG", 10000000);
        Produk pakaian = new Pakaian("Baju Bekas", 100000);

        keranjang.tambahProduk(buku);
        keranjang.tambahProduk(elektronik);
        keranjang.tambahProduk(pakaian);

        System.out.println("Total harga setelah diskon: " + keranjang.hitungTotalHarga());
    }
}

abstract class Produk {
    protected String nama;
    protected double harga;

    public Produk(String nama, double harga) {
        this.nama = nama;
        this.harga = harga;
    }

    public abstract double hitungDiskon(); // abstract method

    public String getNama() {
        return nama;
    }

    public double getHarga() {
        return harga;
    }
}

class Pakaian extends Produk {
    public Pakaian(String nama, double harga) {
        super(nama, harga);
    }

    @Override
    public double hitungDiskon() {
        return harga * 0.05; // 5% discount for clothes
    }
}

class Buku extends Produk {
    public Buku(String nama, double harga) {
        super(nama, harga);
    }

    @Override
    public double hitungDiskon() {
        return harga * 0.10; // 10% discount for books
    }
}

class Elektronik extends Produk {
    public Elektronik(String nama, double harga) {
        super(nama, harga);
    }

    @Override
    public double hitungDiskon() {
        return harga * 0.15; // 15% discount for electronics
    }
}

class KeranjangBelanja {
    private Produk[] daftarProduk;
    private int count;

    public KeranjangBelanja() {
        daftarProduk = new Produk[10]; // Initial size of the cart
        count = 0;
    }

    public void tambahProduk(Produk produk) {
        if (count < daftarProduk.length) {
            daftarProduk[count] = produk;
            count++;
        } else {
            // Expand the array size if needed (manual resizing)
            Produk[] newDaftarProduk = new Produk[daftarProduk.length + 10];
            for (int i = 0; i < daftarProduk.length; i++) {
                newDaftarProduk[i] = daftarProduk[i];
            }
            newDaftarProduk[count] = produk;
            daftarProduk = newDaftarProduk;
            count++;
        }
    }

    public double hitungTotalHarga() {
        double total = 0;
        for (int i = 0; i < count; i++) {
            total += daftarProduk[i].getHarga() - daftarProduk[i].hitungDiskon(); // calculate price after discount
        }
        return total;
    }
}
