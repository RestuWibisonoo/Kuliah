public class Manusia {
    private String nama;
    protected int usia;
    public String Pekerjaan;

    public Manusia(String nama, int usia, String Pekerjaan) {
        this.nama = nama;
        this.usia = usia;
        this.Pekerjaan = Pekerjaan;
    }

    public String getNama() {
        return nama;
    }

    public void setNama(String nama) {
        this.nama = nama;
    }
}
