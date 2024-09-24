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
