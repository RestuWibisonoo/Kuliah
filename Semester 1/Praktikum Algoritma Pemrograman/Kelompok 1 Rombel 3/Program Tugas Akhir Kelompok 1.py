from tabulate import tabulate
from colorama import init, Fore

class Kasir:
    def __init__(self):
        self.cart = []
        self.menu = [
            {"No": 1, "Item": "Kopi", "Price": 15000},
            {"No": 2, "Item": "Teh", "Price": 10000},
            {"No": 3, "Item": "Roti", "Price": 8000},
            {"No": 4, "Item": "Nasi Goreng", "Price": 25000},
            {"No": 5, "Item": "Kwetiaw", "Price": 15000},
            {"No": 6, "Item": "Es Teh Anget", "Price": 10000},
            {"No": 7, "Item": "Gado-gado", "Price": 8000},
            {"No": 8, "Item": "Nasi Putih", "Price": 25000},
        ]

    def lihatMenu(self):
        if not self.menu:
            print("Menu kosong.")
            return

        headers = self.menu[0].keys()
        print(tabulate(self.menu, headers="keys", tablefmt="fancy_grid", colalign=("center", "center", "center")))



    def masukkanKeranjang(self, itemId, quantity):
        for item in self.menu:
            if item["No"] == itemId:
                totalHarga = item["Price"] * quantity
                self.cart.append({"Item": item["Item"], "quantity": quantity, "totalPrice": totalHarga})
                print(f"{quantity} {item['Item']} ditambahkan ke keranjang.")
                return
        print("Item tidak ditemukan.")

    def lihatKeranjang(self):
        if not self.cart:
            print("Keranjang kosong.")
            return

        headers = ["Item", "Quantity", "Total Price"]
        cartData = [[item["Item"], item["quantity"], item["totalPrice"]] for item in self.cart]
        print(tabulate(cartData, headers=headers, tablefmt="fancy_grid", colalign=("center", "center", "center")))

    def beli(self):
        if not self.cart:
            print("Keranjang kosong. Tidak dapat checkout.")
            return

        total = sum(item["totalPrice"] for item in self.cart)
        print(f"Total pembayaran: {total}")
        print("Terima kasih telah berbelanja!")

if __name__ == "__main__":
    init(autoreset=True)  # Inisialisasi colorama
    kasir = Kasir()

    while True:
        print("\n=== Program Kasir ===")
        print("1. Tampilkan Menu")
        print("2. Tambahkan Item ke Keranjang")
        print("3. Tampilkan Keranjang")
        print("4. Checkout")
        print("5. Keluar")

        try:
            pilih = int(input("Pilih menu (1-5): "))
        except ValueError:
            print("Masukkan harus berupa angka.")
            continue

        if pilih == 1:
            kasir.lihatMenu()
        elif pilih == 2:
            itemId = int(input("Masukkan ID item yang ingin ditambahkan: "))
            quantity = int(input("Masukkan jumlah item: "))
            kasir.masukkanKeranjang(itemId, quantity)
        elif pilih == 3:
            kasir.lihatKeranjang()
        elif pilih == 4:
            kasir.beli()
            break
        elif pilih == 5:
            print("Program selesai.")
            break
        else:
            print("Pilihan tidak valid. Silakan pilih menu 1-5.")