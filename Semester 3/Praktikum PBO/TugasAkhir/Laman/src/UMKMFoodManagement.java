import java.io.*;
import java.text.SimpleDateFormat;
import java.util.*;

public class UMKMFoodManagement {

    private static final String MENU_FILE = "menu.txt";
    private static final String TRANSACTION_FILE = "transaksi.txt";
    private Map<Integer, String> menuMapping = new LinkedHashMap<>(); // Menyimpan mapping nomor ke nama menu
    private Map<String, Integer> menu = new LinkedHashMap<>(); // Menyimpan menu dengan nama dan harga
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
            int menuNumber = 1; // Nomor urut untuk setiap menu
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(";");
                if (parts.length == 2) {
                    String name = parts[0].trim();
                    int price = Integer.parseInt(parts[1].trim().replaceAll("rp", "").replace(".", ""));
                    menu.put(name, price);
                    menuMapping.put(menuNumber++, name); // Menambahkan mapping nomor ke nama menu
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

    // Menampilkan menu makanan dengan nomor
    private void tampilkanMenu() {
        System.out.println("\n=== Daftar Menu ===");
        menuMapping.forEach((number, name) -> {
            int price = menu.get(name);
            System.out.printf("%d. %s - Rp%,d\n", number, name, price);
        });
    }

    // Membuat transaksi baru
    private void buatTransaksi() {
        tampilkanMenu();
        System.out.print("\nMasukkan nomor menu: ");
        int menuNumber = scanner.nextInt();
        scanner.nextLine(); // membersihkan newline

        if (menuMapping.containsKey(menuNumber)) {
            String menuName = menuMapping.get(menuNumber);
            int price = menu.get(menuName);

            System.out.print("Masukkan jumlah: ");
            int quantity = scanner.nextInt();
            scanner.nextLine(); // membersihkan newline

            int total = price * quantity;

            // Mendapatkan tanggal saat ini
            String currentDate = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());

            // Menyimpan transaksi ke file transaksi.txt
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(TRANSACTION_FILE, true))) {
                writer.write(String.format("%s;%s;%d;Rp%d\n", currentDate, menuName, quantity, total));
                System.out.printf("Transaksi berhasil dicatat: %s x%d = Rp%,d (Tanggal: %s)\n", menuName, quantity, total, currentDate);
            } catch (IOException e) {
                System.out.println("Terjadi kesalahan saat mencatat transaksi: " + e.getMessage());
            }
        } else {
            System.out.println("Nomor menu tidak ditemukan. Silakan coba lagi.");
        }
    }
}