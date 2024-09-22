public class Kendaraan {
    String nama;
    int kecepatan;

    public void tampilkanInfo() {
        System.out.println("Nama Kendaraan: " + nama);
        System.out.println("Kecepatan: " + kecepatan + " km/jam");
    }
}

// Kelas Menengah KendaraanDarat
class KendaraanDarat extends Kendaraan {
    public void tampilkanInfoDarat() {
        tampilkanInfo();
        System.out.println("Jenis Kendaraan: Darat");
    }
}

// Kelas Turunan Mobil
class Mobil extends KendaraanDarat {
    int jumlahPintu;

    @Override
    public void tampilkanInfo() {
        super.tampilkanInfoDarat();
        System.out.println("Jumlah Pintu: " + jumlahPintu);
    }
}

// Kelas Turunan SepedaMotor
class SepedaMotor extends KendaraanDarat {
    String jenisMesin;

    @Override
    public void tampilkanInfo() {
        super.tampilkanInfoDarat();
        System.out.println("Jenis Mesin: " + jenisMesin);
    }
}
