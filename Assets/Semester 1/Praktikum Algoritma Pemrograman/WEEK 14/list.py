class Barang:
    def __init__(self, nama, tanggalkadaluarsa):
        self.nama = nama
        self.tanggalkadaluarsa = tanggalkadaluarsa

class Kasir:
    def __init__(self):
        self.barang_list = []

    def tambah_barang(self, nama, tanggalkadaluarsa):
        barang_baru = Barang(nama, tanggalkadaluarsa)
        self.barang_list.append(barang_baru)
        print(f"Barang {nama} berhasil ditambahkan!")

    def hapus_barang(self, nama):
        for barang in self.barang_list:
            if barang.nama == nama:
                self.barang_list.remove(barang)
                print(f"Barang {nama} berhasil dihapus!")
                return
        print(f"Barang {nama} tidak ditemukan.")

    def tampilkan_jumlah_barang(self):
        jumlah_barang = len(self.barang_list)
        print(f"Jumlah barang saat ini: {jumlah_barang}")

    def tampilkan_nama_barang(self):
        print("Daftar Nama Barang:")
        for barang in self.barang_list:
            print(barang.nama)
