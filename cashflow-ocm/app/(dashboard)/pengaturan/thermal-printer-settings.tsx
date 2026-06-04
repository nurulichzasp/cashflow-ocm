'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Printer, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

const PAPER_WIDTHS = [
  { value: '58', label: '58 mm', desc: 'Printer kecil standar (paling umum)' },
  { value: '80', label: '80 mm', desc: 'Printer kasir medium' },
]

export function ThermalPrinterSettings() {
  const [paperWidth, setPaperWidth] = useState<'58' | '80'>('58')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('thermal_paper_width')
    if (stored === '80') setPaperWidth('80')
  }, [])

  function handleSave() {
    localStorage.setItem('thermal_paper_width', paperWidth)
    setSaved(true)
    toast.success('Pengaturan printer thermal disimpan')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Printer className="h-4 w-4 text-orange-600" />
          Printer Thermal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Atur ukuran kertas thermal sesuai printer yang Anda gunakan. Pengaturan ini mempengaruhi tampilan nota saat dicetak ke printer thermal.
        </p>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Lebar Kertas</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAPER_WIDTHS.map((pw) => (
              <button
                key={pw.value}
                type="button"
                onClick={() => setPaperWidth(pw.value as '58' | '80')}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  paperWidth === pw.value
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <div className="font-semibold text-sm">{pw.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{pw.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-600 space-y-1">
          <p className="font-semibold text-stone-700">Cara menghubungkan printer thermal:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Hubungkan printer ke komputer/HP via USB atau Bluetooth</li>
            <li>Pastikan driver printer sudah terinstal di perangkat</li>
            <li>Saat mencetak, pilih <strong>Print Thermal</strong> pada tombol cetak</li>
            <li>Di dialog print browser, pilih printer thermal Anda</li>
            <li>Pastikan ukuran kertas sesuai dengan pilihan di atas</li>
          </ol>
        </div>

        <Button
          onClick={handleSave}
          className="gap-2 bg-orange-600 hover:bg-orange-700"
          size="sm"
        >
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
          {saved ? 'Tersimpan' : 'Simpan Pengaturan'}
        </Button>
      </CardContent>
    </Card>
  )
}
