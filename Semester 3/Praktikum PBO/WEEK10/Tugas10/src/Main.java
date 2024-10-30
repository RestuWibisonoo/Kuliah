// Interface Pembayaran
interface Pembayaran {
    double hitungPajak(double harga);
}

// Kelas Elektronik yang mengimplementasikan Pembayaran
class Elektronik implements Pembayaran {
    @Override
    public double hitungPajak(double harga) {
        return harga * 0.10;  // Pajak 10%
    }
}

// Kelas Makanan yang mengimplementasikan Pembayaran
class Makanan implements Pembayaran {
    @Override
    public double hitungPajak(double harga) {
        return harga * 0.05;  // Pajak 5%
    }
}

// Kelas Main untuk menjalankan program
public class Main {
    public static void main(String[] args) {
        Pembayaran elektronik = new Elektronik();
        Pembayaran makanan = new Makanan();

        double hargaElektronik = 1000000;  // Contoh harga
        double hargaMakanan = 50000;       // Contoh harga

        System.out.println("Pajak Elektronik: " + elektronik.hitungPajak(hargaElektronik));
        System.out.println("Pajak Makanan: " + makanan.hitungPajak(hargaMakanan));
    }
}
