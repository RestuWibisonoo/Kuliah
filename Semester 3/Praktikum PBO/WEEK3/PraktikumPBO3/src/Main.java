public class Main {
    public static void main(String[] args) {
        // Membuat dua objek Mobil
        Mobil mobil1 = new Mobil("Toyota", "Camry", 2020, "Hitam");
        Mobil mobil2 = new Mobil("Honda", "Civic", 2021, "Putih");

        // Tampilan informasi mobil
        System.out.println("Informasi Mobil 1:");
        mobil1.displayInfo();
        mobil1.startEngine();
        
        System.out.println("\nInformasi Mobil 2:");
        mobil2.displayInfo();
        mobil2.startEngine();
        
        // Ubah warna mobil1
        mobil1.setWarna("Merah");
        System.out.println("\nInformasi Mobil 1 Setelah Diubah:");
        mobil1.displayInfo();
    }
}
