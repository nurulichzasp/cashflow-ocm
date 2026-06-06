import { notifyNewPembelian, notifyNewPenjualan, notifyNewBiaya } from '@/lib/notification'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type') || 'pembelian'

  try {
    if (type === 'pembelian') {
      await notifyNewPembelian({
        tanggal: '2026-06-06',
        kategori: 'OCM R1',
        peronId: 'test-peron-1',
        tonase: 15.5,
        totalBeli: 4_650_000,
        keuntungan: 1_085_000,
        statusBayarPeron: 'lunas',
        catatan: 'Test notifikasi pembelian',
        createdByName: 'Kasir Budi',
        createdByRole: 'kasir',
      })

      return Response.json({
        success: true,
        message: 'Test Pembelian notification sent',
        preview: {
          title: '📥 TRANSAKSI PEMBELIAN BARU',
          user: '👤 Dibuat oleh: Kasir Budi (kasir)',
          details: {
            tanggal: '2026-06-06',
            peron: 'Husein',
            kategori: 'OCM R1',
            tonase: '15.5 kg',
            totalBeli: 'Rp 4.650.000',
            keuntungan: 'Rp 1.085.000',
            status: '✅ Lunas',
          },
        },
      })
    }

    if (type === 'penjualan') {
      await notifyNewPenjualan({
        tanggal: '2026-06-06',
        noInvoice: 'NP/1/06/2026/001',
        noBast: 'BAST-001',
        totalBersih: 12_500_000,
        totalNilai: 14_000_000,
        statusBayar: 'lunas',
        catatan: 'Penjualan ke PKS BGA',
        createdByName: 'Admin Sistem',
        createdByRole: 'admin',
      })

      return Response.json({
        success: true,
        message: 'Test Penjualan notification sent',
        preview: {
          title: '📤 TRANSAKSI PENJUALAN BARU',
          user: '👤 Dibuat oleh: Admin Sistem (admin)',
          details: {
            tanggal: '2026-06-06',
            noInvoice: 'NP/1/06/2026/001',
            noBast: 'BAST-001',
            totalBersih: 'Rp 12.500.000',
            totalNilai: 'Rp 14.000.000',
            status: '✅ Lunas',
          },
        },
      })
    }

    if (type === 'biaya') {
      await notifyNewBiaya({
        tanggal: '2026-06-06',
        kategori: 'solar',
        jumlah: 500_000,
        catatan: 'Solar untuk operasional',
        createdByName: 'Driver Andi',
        createdByRole: 'kasir',
      })

      return Response.json({
        success: true,
        message: 'Test Biaya notification sent',
        preview: {
          title: '💸 BIAYA OPERASIONAL BARU',
          user: '👤 Dibuat oleh: Driver Andi (kasir)',
          details: {
            tanggal: '2026-06-06',
            kategori: 'solar',
            jumlah: 'Rp 500.000',
          },
        },
      })
    }

    return Response.json({
      success: false,
      message: 'Invalid type. Use ?type=pembelian|penjualan|biaya',
    })
  } catch (error) {
    console.error('Test failed:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    )
  }
}
