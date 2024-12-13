import java.io.*;
import java.text.SimpleDateFormat;
import java.util.*;
import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

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
        // Mengatur font untuk teks di JOptionPane
        Font font = new Font("Arial", Font.PLAIN, 24); // Memperbesar font
        UIManager.put("OptionPane.font", font); // Mengatur font default untuk JOptionPane

        JFrame frame = new JFrame();  // Membuat jendela utama
        frame.setSize(600, 400);      // Mengatur ukuran jendela
        frame.setLocationRelativeTo(null); // Menempatkan jendela di tengah layar
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

        // Membuat panel untuk tombol-tombol menu
        JPanel panel = new JPanel();
        panel.setLayout(new GridBagLayout()); // Menggunakan GridBagLayout untuk penataan yang lebih fleksibel

        GridBagConstraints gbc = new GridBagConstraints();
        gbc.gridx = 0; // Menentukan posisi di grid (kolom 0)
        gbc.gridy = 0; // Menentukan posisi di grid (baris 0)
        gbc.insets = new Insets(10, 10, 10, 10); // Memberikan jarak antar tombol

        // Menambahkan tombol dengan ukuran lebih besar
        JButton lihatMenuButton = createButton("Lihat Menu");
        JButton buatTransaksiButton = createButton("Buat Transaksi");
        JButton keluarButton = createButton("Keluar");

        // Menambahkan tombol ke panel menggunakan GridBagLayout
        panel.add(lihatMenuButton, gbc);

        gbc.gridy++; // Menambahkan tombol pada baris berikutnya
        panel.add(buatTransaksiButton, gbc);

        gbc.gridy++; // Menambahkan tombol pada baris berikutnya
        panel.add(keluarButton, gbc);

        // Menambahkan panel ke frame dan memastikan semuanya berada di tengah
        frame.getContentPane().add(panel, BorderLayout.CENTER);
        frame.setVisible(true);

        // Mengatur aksi untuk setiap tombol
        lihatMenuButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                tampilkanMenu();
            }
        });

        buatTransaksiButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                buatTransaksi();
            }
        });

        keluarButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                JOptionPane.showMessageDialog(frame, "Terima kasih telah menggunakan aplikasi ini!");
                frame.dispose(); // Menutup aplikasi
            }
        });
    }

    // Membuat tombol dengan ukuran besar dan margin
    private JButton createButton(String text) {
        JButton button = new JButton(text);
        button.setPreferredSize(new Dimension(200, 50));  // Menambah ukuran tombol
        button.setFont(new Font("Arial", Font.PLAIN, 18)); // Mengatur ukuran font tombol
        button.setMargin(new Insets(10, 10, 10, 10)); // Menambah margin di dalam tombol
        return button;
    }

    // Menampilkan menu makanan dengan nomor
    private void tampilkanMenu() {
        StringBuilder menuDisplay = new StringBuilder("\n=== Daftar Menu ===\n");
        menu.forEach((name, price) -> {
            menuDisplay.append(String.format("%s - Rp%,d\n", name, price)); // Menghapus nomor urut
        });

        // Menampilkan menu dalam jendela besar dengan ukuran font yang lebih besar
        JOptionPane.showMessageDialog(null, menuDisplay.toString(), "Menu Makanan", JOptionPane.INFORMATION_MESSAGE);
    }

    // Membuat transaksi baru
    private void buatTransaksi() {
        tampilkanMenu();
        String input = JOptionPane.showInputDialog("Masukkan nomor menu: ");
        try {
            int menuNumber = Integer.parseInt(input);
            if (menuMapping.containsKey(menuNumber)) {
                String menuName = menuMapping.get(menuNumber);
                int price = menu.get(menuName);

                input = JOptionPane.showInputDialog("Masukkan jumlah: ");
                int quantity = Integer.parseInt(input);

                int total = price * quantity;

                // Mendapatkan tanggal saat ini
                String currentDate = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());

                // Menyimpan transaksi ke file transaksi.txt
                try (BufferedWriter writer = new BufferedWriter(new FileWriter(TRANSACTION_FILE, true))) {
                    writer.write(String.format("%s;%s;%d;Rp%d\n", currentDate, menuName, quantity, total));
                    JOptionPane.showMessageDialog(null, String.format("Transaksi berhasil dicatat: %s x%d = Rp%,d (Tanggal: %s)", menuName, quantity, total, currentDate));
                } catch (IOException e) {
                    JOptionPane.showMessageDialog(null, "Terjadi kesalahan saat mencatat transaksi: " + e.getMessage());
                }
            } else {
                JOptionPane.showMessageDialog(null, "Nomor menu tidak ditemukan. Silakan coba lagi.");
            }
        } catch (NumberFormatException e) {
            JOptionPane.showMessageDialog(null, "Input tidak valid. Silakan coba lagi.");
        }
    }
}
