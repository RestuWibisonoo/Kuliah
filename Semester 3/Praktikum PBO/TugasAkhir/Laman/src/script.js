// Fetch daftar menu dari server
fetch('/menu')
    .then(response => response.json())
    .then(data => {
        const menuTable = document.getElementById('menuTable').querySelector('tbody');
        data.forEach(menuItem => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${menuItem.name}</td>
                <td>Rp${menuItem.price.toLocaleString()}</td>
                <td><button onclick="transact('${menuItem.name}', ${menuItem.price})">Beli</button></td>
            `;
            menuTable.appendChild(row);
        });
    });

// Menyimpan transaksi
function transact(name, price) {
    const quantity = prompt(`Masukkan jumlah untuk ${name}:`, "1");
    if (quantity && !isNaN(quantity) && quantity > 0) {
        fetch(`/transact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, quantity })
        }).then(() => alert(`Transaksi untuk ${name} berhasil dicatat!`));
    } else {
        alert("Jumlah tidak valid.");
    }
}

// Tampilkan atau sembunyikan daftar transaksi
function toggleTransactionList() {
    const transactionList = document.getElementById('transactionList');
    if (transactionList.style.display === 'none' || transactionList.style.display === '') {
        fetch('/transactions')
            .then(response => response.text())
            .then(data => {
                const transactionUl = document.getElementById('transactions');
                transactionUl.innerHTML = '';
                data.split('\n').forEach(line => {
                    if (line.trim()) {
                        const li = document.createElement('li');
                        li.textContent = line;
                        transactionUl.appendChild(li);
                    }
                });
                transactionList.style.display = 'block';
            });
    } else {
        transactionList.style.display = 'none';
    }
}
