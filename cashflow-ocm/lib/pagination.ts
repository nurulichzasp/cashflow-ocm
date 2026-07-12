// Ukuran halaman default list transaksi (pembelian/penjualan/kas/biaya).
// Dipakai server action (limit query) DAN komponen tabel (offset "Muat lebih
// banyak") — satu sumber supaya offset klien selalu cocok dengan window server.
// CATATAN: tidak boleh ditaruh di file 'use server' (hanya boleh export async fn).
export const LIST_PAGE_SIZE = 200
