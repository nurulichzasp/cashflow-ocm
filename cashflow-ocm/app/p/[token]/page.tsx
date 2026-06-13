export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getPortalData, type Periode } from '@/lib/peron-portal/data'
import { formatRupiah, formatTanggal } from '@/lib/format'

export const metadata = {
  title: 'Laporan Setoran — CV OCM',
  robots: { index: false, follow: false }, // jangan di-index mesin pencari
}

const PERIODES: { v: Periode; l: string }[] = [
  { v: 'bulan-ini', l: 'Bulan Ini' },
  { v: 'bulan-lalu', l: 'Bulan Lalu' },
  { v: 'semua', l: 'Semua' },
]

const KATEGORI_LABEL: Record<string, string> = {
  'OCM R1': 'TBS', 'OCM R2': 'TBS', 'OCMP SAGU': 'TBS',
  'OCM BRDL': 'Brondolan', 'OCM BRDL KTWM': 'Brondolan KTWM',
  'OCM BRDL TRYM': 'Brondolan TRYM', 'OCM BRDL LMDM': 'Brondolan LMDM',
}

function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F6F7F6] px-6 text-center" style={{ colorScheme: 'light' }}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0E7A58] text-base font-bold text-white">OCM</div>
      <h1 className="mt-5 text-lg font-semibold text-zinc-900">Link tidak berlaku</h1>
      <p className="mt-1.5 max-w-[30ch] text-sm text-zinc-500">
        Link ini sudah tidak aktif atau salah. Silakan hubungi OCM untuk link terbaru.
      </p>
    </main>
  )
}

export default async function PortalPeronPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ periode?: string }>
}) {
  const { token } = await params
  const sp = await searchParams
  const periode = (['bulan-ini', 'bulan-lalu', 'semua'].includes(sp.periode ?? '') ? sp.periode : 'bulan-ini') as Periode

  const data = await getPortalData(token, periode)
  if (!data) return <NotFound />

  const wa = process.env.NEXT_PUBLIC_OCM_WHATSAPP
  const negatif = data.sisaBelumDibayar < 0

  return (
    <main
      className="min-h-[100dvh] bg-[#F6F7F6] text-zinc-900"
      style={{ colorScheme: 'light', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
    >
      <div className="mx-auto w-full max-w-md px-4 pb-10">
        {/* Header */}
        <header className="flex items-center gap-3 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E7A58] text-[13px] font-bold text-white">OCM</div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Laporan untuk</p>
            <p className="truncate text-base font-bold text-zinc-900">{data.nama}</p>
          </div>
        </header>

        {/* Sisa Belum Dibayar — kartu utama */}
        <section className="rounded-2xl bg-[#0E7A58] px-5 py-6 text-white shadow-[0_10px_30px_-12px_rgba(14,122,88,0.5)]">
          <p className="text-[13px] font-medium text-white/80">{negatif ? 'Saldo OCM untuk Anda' : 'Sisa Belum Dibayar'}</p>
          <p className="mt-1 text-[34px] font-bold leading-tight tabular-nums">{formatRupiah(Math.abs(data.sisaBelumDibayar))}</p>
        </section>

        {/* Periode */}
        <div className="mt-5 flex gap-1.5">
          {PERIODES.map((p) => {
            const active = p.v === periode
            return (
              <Link
                key={p.v}
                href={`/p/${token}?periode=${p.v}`}
                className={`flex-1 rounded-full px-3 py-2 text-center text-[13px] font-medium transition-colors ${
                  active ? 'bg-[#0E7A58] text-white' : 'bg-[#FFFFFF] text-zinc-600 ring-1 ring-zinc-200'
                }`}
              >
                {p.l}
              </Link>
            )
          })}
        </div>

        {/* Ringkasan periode */}
        <section className="mt-3 rounded-2xl bg-[#FFFFFF] p-4 ring-1 ring-zinc-100">
          <Row label="Total setor" value={`${data.totalKg.toLocaleString('id-ID')} kg`} />
          <Row label="Total nilai" value={formatRupiah(data.totalNilai)} />
          <Row label="Sudah dibayar" value={formatRupiah(data.sudahDibayar)} last />
        </section>

        {/* Harga acuan hari ini */}
        {data.hargaTerkini.length > 0 && (
          <section className="mt-3 rounded-2xl bg-[#FFFFFF] p-4 ring-1 ring-zinc-100">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-zinc-400">Harga acuan terkini</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {data.hargaTerkini.map((h) => (
                <span key={h.produk} className="text-[13px] text-zinc-700">
                  {h.produk} <b className="font-semibold tabular-nums">Rp {h.harga.toLocaleString('id-ID')}</b>/kg
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Riwayat setoran */}
        <SectionTitle>Riwayat Setoran</SectionTitle>
        {data.setoran.length === 0 ? (
          <Empty>Belum ada setoran di periode ini.</Empty>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-[#FFFFFF] ring-1 ring-zinc-100">
            {data.setoran.map((s, i) => (
              <div key={i} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-zinc-100' : ''}`}>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-zinc-900">{formatTanggal(s.tanggal)}</p>
                  <p className="text-[12px] text-zinc-500">
                    {KATEGORI_LABEL[s.kategori] ?? s.kategori} · {(s.tonase ?? 0).toLocaleString('id-ID')} kg · Rp {(s.hargaBeli ?? 0).toLocaleString('id-ID')}/kg
                  </p>
                </div>
                <p className="shrink-0 text-[13px] font-semibold tabular-nums text-zinc-900">{formatRupiah(s.total ?? 0)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Riwayat pembayaran */}
        <SectionTitle>Riwayat Pembayaran</SectionTitle>
        {data.pembayaran.length === 0 ? (
          <Empty>Belum ada pembayaran di periode ini.</Empty>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-[#FFFFFF] ring-1 ring-zinc-100">
            {data.pembayaran.map((p, i) => (
              <div key={i} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-zinc-100' : ''}`}>
                <p className="text-[13px] font-medium text-zinc-900">{formatTanggal(p.tanggal)}</p>
                <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[#0E7A58]">{formatRupiah(p.jumlah ?? 0)}</p>
              </div>
            ))}
          </div>
        )}

        {/* WA CTA */}
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0E7A58] text-base font-semibold text-white"
          >
            Ada pertanyaan? Chat WhatsApp
          </a>
        )}

        <p className="mt-6 text-center text-[11px] text-zinc-400">CV Omanda Cerli Mandiri · laporan ini hanya untuk {data.nama}</p>
      </div>
    </main>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${last ? '' : 'border-b border-zinc-100'}`}>
      <span className="text-[13px] text-zinc-500">{label}</span>
      <span className="text-[14px] font-semibold tabular-nums text-zinc-900">{value}</span>
    </div>
  )
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-5 px-1 text-[12px] font-semibold uppercase tracking-widest text-zinc-400">{children}</p>
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-[#FFFFFF] px-4 py-6 text-center text-[13px] text-zinc-400 ring-1 ring-zinc-100">{children}</div>
}
