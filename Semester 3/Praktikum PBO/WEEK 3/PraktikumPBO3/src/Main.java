// File: Main.java
public class Main {
    public static void main(String[] args) {
        // Ciptakan dua objek dari kelas Mobil
        Mobil mobil1 = new Mobil("Toyota", "Camry", 2020, "Hitam");
        Mobil mobil2 = new Mobil("Honda", "Civic", 2021, "Putih");

        // Tampilkan informasi kedua objek
        System.out.println("Informasi Mobil 1:");
        mobil1.displayInfo();
        mobil1.startEngine();
        
        System.out.println("\nInformasi Mobil 2:");
        mobil2.displayInfo();
        mobil2.startEngine();
        
        // Ubah warna mobil1 dan tampilkan perubahan
        mobil1.setWarna("Merah");
        System.out.println("\nInformasi Mobil 1 Setelah Diubah:");
        mobil1.displayInfo();
    }
}
