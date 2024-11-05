interface Pembayaran {
    double hitungPajak(double harga);
}

class Elektronik implements Pembayaran {
    @Override
    public double hitungPajak(double harga) {
        return harga * 0.10;
    }
}

class Makanan implements Pembayaran {
    @Override
    public double hitungPajak(double harga) {
        return harga * 0.05;
    }
}

public class Main {
    public static void main(String[] args) {
        Pembayaran elektronik = new Elektronik();
        Pembayaran makanan = new Makanan();

        double hargaElektronik = 1000000;
        double hargaMakanan = 50000;

        System.out.println("Pajak Elektronik: " + elektronik.hitungPajak(hargaElektronik));
        System.out.println("Pajak Makanan: " + makanan.hitungPajak(hargaMakanan));
    }
}
