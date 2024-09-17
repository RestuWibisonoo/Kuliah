public class Mobil {
    private String merk;
    private String model;
    private int tahun;
    private String warna;

    public Mobil(String merk, String model, int tahun, String warna) {
        this.merk = merk;
        this.model = model;
        this.tahun = tahun;
        this.warna = warna;
    }

    // merk
    public String getMerk() {
        return merk;
    }

    public void setMerk(String merk) {
        this.merk = merk;
    }

    // model
    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    // tahun
    public int getTahun() {
        return tahun;
    }

    public void setTahun(int tahun) {
        this.tahun = tahun;
    }

    // warna
    public String getWarna() {
        return warna;
    }

    public void setWarna(String warna) {
        this.warna = warna;
    }

    // Method untuk menampilkan informasi mobil
    public void displayInfo() {
        System.out.println("Merk: " + merk);
        System.out.println("Model: " + model);
        System.out.println("Tahun: " + tahun);
        System.out.println("Warna: " + warna);
    }

    // Method untuk menyalakan mesin
    public void startEngine() {
        System.out.println("Mesin mobil " + merk + " menyala");
    }
}
