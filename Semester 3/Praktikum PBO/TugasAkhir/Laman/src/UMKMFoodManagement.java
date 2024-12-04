import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.io.*;
import java.util.*;

public class UMKMFoodManagement {
    private static final String MENU_FILE = "menu.txt";
    private static final String TRANSACTION_FILE = "transaksi.txt";
    private Map<String, Integer> menu = new LinkedHashMap<>();

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            UMKMFoodManagement app = new UMKMFoodManagement();
            app.loadMenu();
            app.createMainWindow();
        });
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
        } catch (IOException e) {
            JOptionPane.showMessageDialog(null, "Terjadi kesalahan saat membaca menu: " + e.getMessage(),
                    "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    // Membuat jendela utama
    private void createMainWindow() {
        JFrame frame = new JFrame("UMKM Food Management");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(400, 300);
        frame.setLayout(new GridLayout(3, 1));

        JButton viewMenuButton = new JButton("Lihat Menu");
        JButton createTransactionButton = new JButton("Buat Transaksi");
        JButton exitButton = new JButton("Keluar");

        viewMenuButton.addActionListener(e -> showMenu());
        createTransactionButton.addActionListener(e -> createTransaction());
        exitButton.addActionListener(e -> {
            JOptionPane.showMessageDialog(frame, "Terima kasih telah menggunakan aplikasi ini!");
            System.exit(0);
        });

        frame.add(viewMenuButton);
        frame.add(createTransactionButton);
        frame.add(exitButton);

        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }

    // Menampilkan daftar menu
    private void showMenu() {
        StringBuilder menuDisplay = new StringBuilder("=== Daftar Menu ===\n");
        menu.forEach((name, price) -> menuDisplay.append(String.format("%s - Rp%,d\n", name, price)));

        JOptionPane.showMessageDialog(null, menuDisplay.toString(), "Daftar Menu", JOptionPane.INFORMATION_MESSAGE);
    }

    // Membuat transaksi
    private void createTransaction() {
        String menuName = (String) JOptionPane.showInputDialog(null, "Masukkan nama menu:", 
                "Buat Transaksi", JOptionPane.QUESTION_MESSAGE, null, null, null);

        if (menuName != null && menu.containsKey(menuName)) {
            int price = menu.get(menuName);
            String quantityStr = JOptionPane.showInputDialog("Masukkan jumlah:");
            
            try {
                int quantity = Integer.parseInt(quantityStr);
                int total = price * quantity;

                // Menyimpan transaksi ke file
                try (BufferedWriter writer = new BufferedWriter(new FileWriter(TRANSACTION_FILE, true))) {
                    writer.write(String.format("%s;%d;Rp%d\n", menuName, quantity, total));
                    JOptionPane.showMessageDialog(null,
                            String.format("Transaksi berhasil dicatat:\n%s x%d = Rp%,d", menuName, quantity, total),
                            "Transaksi Berhasil", JOptionPane.INFORMATION_MESSAGE);
                } catch (IOException e) {
                    JOptionPane.showMessageDialog(null, "Terjadi kesalahan saat mencatat transaksi: " + e.getMessage(),
                            "Error", JOptionPane.ERROR_MESSAGE);
                }
            } catch (NumberFormatException e) {
                JOptionPane.showMessageDialog(null, "Jumlah tidak valid!", "Error", JOptionPane.ERROR_MESSAGE);
            }
        } else if (menuName != null) {
            JOptionPane.showMessageDialog(null, "Menu tidak ditemukan!", "Error", JOptionPane.ERROR_MESSAGE);
        }
    }
}

