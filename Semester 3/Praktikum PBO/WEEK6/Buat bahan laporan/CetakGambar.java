public class CetakGambar {
    
    private void tampil(Bentuk[] obj) {
        for (Bentuk bentuk : obj) {
            bentuk.gambar();
            bentuk.hapus();
            System.out.println("=========");
        }
    }

    public static void main(String[] args) {
        Bentuk[] obj = { new Lingkaran(), new Segitiga(), new Elips() };
        CetakGambar cetak = new CetakGambar();

        cetak.tampil(obj);
    }
}
