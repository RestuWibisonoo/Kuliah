import java.util.ArrayList;
import java.util.List;

// Kelas Buku
class Buku {
    private String judul;
    private Pengarang pengarang;

    public Buku(String judul, Pengarang pengarang) {
        this.judul = judul;
        this.pengarang = pengarang;
    }

    public void infoBuku() {
        System.out.println("Judul Buku: " + judul);
        if (pengarang != null) {
            pengarang.infoPengarang();
        }
    }
}

// Kelas Pengarang
class Pengarang {
    private String namaPengarang;

    public Pengarang(String namaPengarang) {
        this.namaPengarang = namaPengarang;
    }

    public void infoPengarang() {
        System.out.println("Nama Pengarang: " + namaPengarang);
    }
}

// Kelas Perpustakaan
class Perpustakaan {
    private List<Buku> daftarBuku;

    public Perpustakaan() {
        this.daftarBuku = new ArrayList<>();
    }

    public void tambahBuku(Buku buku) {
        daftarBuku.add(buku);
    }

    public void infoPerpustakaan() {
        System.out.println("Daftar Buku di Perpustakaan:");
        for (Buku buku : daftarBuku) {
            buku.infoBuku();
        }
    }
}

// Main Program
public class SistemPerpustakaan {
    public static void main(String[] args) {
        // Membuat pengarang
        Pengarang pengarang1 = new Pengarang("Tere Liye");
        Pengarang pengarang2 = new Pengarang("Andrea Hirata");

        // Membuat buku dengan pengarang
        Buku buku1 = new Buku("Bumi", pengarang1);
        Buku buku2 = new Buku("Laskar Pelangi", pengarang2);

        // Membuat perpustakaan
        Perpustakaan perpustakaan = new Perpustakaan();

        // Menambahkan buku ke perpustakaan
        perpustakaan.tambahBuku(buku1);
        perpustakaan.tambahBuku(buku2);

        // Menampilkan informasi perpustakaan
        perpustakaan.infoPerpustakaan();
    }
}

