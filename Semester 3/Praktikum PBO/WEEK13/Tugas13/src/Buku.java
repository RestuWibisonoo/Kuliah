import java.io.Serializable;

public class Buku implements Serializable {
    private String judul;
    private String pengarang;
    private int tahunTerbit;

    // Konstruktor
    public Buku(String judul, String pengarang, int tahunTerbit) {
        this.judul = judul;
        this.pengarang = pengarang;
        this.tahunTerbit = tahunTerbit;
    }

    // Getter dan Setter
    public String getJudul() {
        return judul;
    }

    public void setJudul(String judul) {
        this.judul = judul;
    }

    public String getPengarang() {
        return pengarang;
    }

    public void setPengarang(String pengarang) {
        this.pengarang = pengarang;
    }

    public int getTahunTerbit() {
        return tahunTerbit;
    }

    public void setTahunTerbit(int tahunTerbit) {
        this.tahunTerbit = tahunTerbit;
    }

    @Override
    public String toString() {
        return "Judul: " + judul + ", Pengarang: " + pengarang + ", Tahun Terbit: " + tahunTerbit;
    }
}
