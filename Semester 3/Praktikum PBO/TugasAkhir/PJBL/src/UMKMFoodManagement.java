import java.io.*;
import java.util.*;

public class UMKMFoodManagement {

    private static final String MENU_FILE = "menu.txt";
    private static final String TRANSACTION_FILE = "transaksi.txt";
    private Map<String, Integer> menu = new LinkedHashMap<>();
    private Scanner scanner = new Scanner(System.in);

    public static void main(String[] args) {
        UMKMFoodManagement app = new UMKMFoodManagement();
        app.loadMenu();
        app.menu();
    }

    // Memuat menu dari file menu.txt
    private void loadMenu() {
        try (BufferedReader reader = new BufferedReader(new FileReader(MENU_FILE))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(";");
                if (parts.length == 2) {
                    String name = parts[0].trim();
                    int price = Integer.parseInt(parts[1].trim().replaceAll("rp", "").replace(".", ""));
                    menu.put(name, price);
                }
            }
            System.out.println("Menu berhasil dimuat!");
        } catch (IOException e) {
            System.out.println("Terjadi kesalahan saat membaca menu: " + e.getMessage());
        }
    }

    // Menampilkan menu utama
    private void menu() {
        while (true) {
            System.out.println("\n=== Aplikasi UMKM Makanan ===");
            System.out.println("1. Lihat Menu");
            System.out.println("2. Buat Transaksi");
            System.out.println("3. Keluar");
            System.out.print("Pilih opsi: ");

            int choice = scanner.nextInt();
            scanner.nextLine(); // membersihkan newline

            switch (choice) {
                case 1:
                    tampilkanMenu();
                    break;
                case 2:
                    buatTransaksi();
                    break;
                case 3:
                    System.out.println("Terima kasih telah menggunakan aplikasi ini!");
                    return;
                default:
                    System.out.println("Pilihan tidak valid. Coba lagi.");
            }
        }
    }

    // Menampilkan menu makanan
    private void tampilkanMenu() {
        System.out.println("\n=== Daftar Menu ===");
        menu.forEach((name, price) -> System.out.printf("%s - Rp%,d\n", name, price));
    }

    // Membuat transaksi baru
    private void buatTransaksi() {
        tampilkanMenu();
        System.out.print("\nMasukkan nama menu: ");
        String menuName = scanner.nextLine();

        if (menu.containsKey(menuName)) {
            int price = menu.get(menuName);
            System.out.print("Masukkan jumlah: ");
            int quantity = scanner.nextInt();
            scanner.nextLine(); // membersihkan newline
            int total = price * quantity;

            // Menyimpan transaksi ke file transaksi.txt
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(TRANSACTION_FILE, true))) {
                writer.write(String.format("%s;%d;Rp%d\n", menuName, quantity, total));
                System.out.printf("Transaksi berhasil dicatat: %s x%d = Rp%,d\n", menuName, quantity, total);
            } catch (IOException e) {
                System.out.println("Terjadi kesalahan saat mencatat transaksi: " + e.getMessage());
            }
        } else {
            System.out.println("Menu tidak ditemukan. Silakan coba lagi.");
        }
    }
}