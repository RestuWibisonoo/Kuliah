public class Main {
    public static void main(String[] args) throws Exception {
        // Test for Hewan class
        Kucing kucing = new Kucing();
        kucing.nama = "Tom";
        kucing.jenis = "Kucing Anggora";
        kucing.tampilkanInfo();

        Anjing anjing = new Anjing();
        anjing.nama = "Spike";
        anjing.jenis = "Bulldog";
        anjing.tampilkanInfo();

        // Test for Kendaraan class
        Mobil mobil = new Mobil();
        mobil.nama = "Toyota";
        mobil.kecepatan = 180;
        mobil.jumlahPintu = 4;
        mobil.tampilkanInfo();

        SepedaMotor motor = new SepedaMotor();
        motor.nama = "Yamaha";
        motor.kecepatan = 120;
        motor.jenisMesin = "2-tak";
        motor.tampilkanInfo();
    }
}
