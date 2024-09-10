public class Pekerja extends Manusia {
    private int gaji;

    public Pekerja(String nama, int usia, String Pekerjaan, int gaji) {
        super(nama, usia, Pekerjaan);
        this.gaji = gaji;
    }

    public int getGaji() {
        return gaji;
    }

    public void setGaji(int gaji) {
        this.gaji = gaji;
    }

    @Override
    public String toString() {
        return "Nama : " + getNama() + "\nUsia : " + usia + "\nPekerjaan : " + Pekerjaan + "\nGaji : " + gaji;
    }

    
}
