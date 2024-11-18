import java.io.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class SistemPerpustakaan {

    private static final String FILE_BUKU_TXT = "buku.txt";
    private static final String FILE_BUKU_SER = "buku.ser";

    private List<Buku> bukuList = new ArrayList<>();
    private Scanner scanner = new Scanner(System.in);

    public static void main(String[] args) {
        SistemPerpustakaan sistem = new SistemPerpustakaan();
        sistem.menu();
    }

    public void menu() {
        while (true) {
            System.out.println("Menu:");
            System.out.println("1. Tambah Buku Baru");
            System.out.println("2. Tampilkan Daftar Buku (Text File)");
            System.out.println("3. Tampilkan Daftar Buku (Serialized File)");
            System.out.println("4. Keluar");
            System.out.print("Pilih opsi: ");

            int pilihan = scanner.nextInt();
            scanner.nextLine(); // membersihkan newline

            switch (pilihan) {
                case 1:
                    tambahBuku();
                    break;
                case 2:
                    tampilkanBukuDariFile(TEXT_FILE);
                    break;
                case 3:
                    tampilkanBukuDariFile(SERIALIZED_FILE);
                    break;
                case 4:
                    System.out.println("Keluar dari program.");
                    return;
                default:
                    System.out.println("Pilihan tidak valid.");
            }
        }
    }

    // Menambah buku baru dan menyimpan ke file buku.txt (File I/O)
    private void tambahBuku() {
        System.out.print("Masukkan judul buku: ");
        String judul = scanner.nextLine();
        System.out.print("Masukkan pengarang buku: ");
        String pengarang = scanner.nextLine();
        System.out.print("Masukkan tahun terbit buku: ");
        int tahunTerbit = scanner.nextInt();
        scanner.nextLine(); // membersihkan newline

        Buku buku = new Buku(judul, pengarang, tahunTerbit);
        bukuList.add(buku);

        simpanBukuKeFile();
        simpanBukuKeSerializedFile(buku);
    }

    // Menyimpan daftar buku ke dalam file buku.txt (File I/O)
    private void simpanBukuKeFile() {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(FILE_BUKU_TXT, true))) {
            for (Buku buku : bukuList) {
                writer.write(buku.getJudul() + "," + buku.getPengarang() + "," + buku.getTahunTerbit());
                writer.newLine();
            }
            System.out.println("Buku berhasil disimpan ke buku.txt.");
        } catch (IOException e) {
            System.out.println("Terjadi kesalahan saat menyimpan ke buku.txt: " + e.getMessage());
        }
    }

    // Menyimpan objek Buku ke file buku.ser (Serialisasi)
    private void simpanBukuKeSerializedFile(Buku buku) {
        try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(FILE_BUKU_SER, true))) {
            oos.writeObject(buku);
            System.out.println("Buku berhasil disimpan ke buku.ser.");
        } catch (IOException e) {
            System.out.println("Terjadi kesalahan saat menyimpan ke buku.ser: " + e.getMessage());
        }
    }

    // Menampilkan daftar buku dari file buku.txt
    private void tampilkanBukuDariFile(String fileType) {
        if (fileType.equals("text")) {
            try (BufferedReader reader = new BufferedReader(new FileReader(FILE_BUKU_TXT))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String[] data = line.split(",");
                    System.out.println("Judul: " + data[0] + ", Pengarang: " + data[1] + ", Tahun Terbit: " + data[2]);
                }
            } catch (IOException e) {
                System.out.println("Terjadi kesalahan saat membaca dari buku.txt: " + e.getMessage());
            }
        } else if (fileType.equals("serialized")) {
            try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream(FILE_BUKU_SER))) {
                Buku buku;
                while ((buku = (Buku) ois.readObject()) != null) {
                    System.out.println(buku);
                }
            } catch (EOFException e) {
                // End of file reached
            } catch (IOException | ClassNotFoundException e) {
                System.out.println("Terjadi kesalahan saat membaca dari buku.ser: " + e.getMessage());
            }
        }
    }
}
