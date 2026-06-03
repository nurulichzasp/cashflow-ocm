'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { deleteModalPeron } from '../actions'
import { Trash2 } from 'lucide-react'
import type { ModalPeron } from '@/lib/db/schema'

interface Props {
  modal: ModalPeron[]
  isOwner: boolean
}

const jenisBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  tambah: { label: 'Tambah', variant: 'default' },
  kurang: { label: 'Kurang', variant: 'secondary' },
  kembali: { label: 'Kembali', variant: 'outline' },
}

export function ModalHistoryTable({ modal, isOwner }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteModalPeron(id)
      toast.success('Entri modal dihapus')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Riwayat DP / Modal</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {modal.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-8 text-center">
            Belum ada mutasi modal untuk peron ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-y">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tanggal</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Jenis</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Jumlah</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Catatan</th>
                  {isOwner && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {modal.map((m, i) => {
                  const { label, variant } = jenisBadge[m.jenis] ?? { label: m.jenis, variant: 'secondary' }
                  return (
                    <tr key={m.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                      <td className="px-4 py-2.5">{formatTanggal(m.tanggal)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant={variant}>{label}</Badge>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${m.jenis === 'tambah' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.jenis === 'tambah' ? '+' : '-'} {formatRupiah(m.jumlah)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{m.catatan ?? '-'}</td>
                      {isOwner && (
                        <td className="px-4 py-2.5 text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus entri ini?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Mutasi <strong>{label}</strong> sebesar <strong>{formatRupiah(m.jumlah)}</strong> pada {formatTanggal(m.tanggal)} akan dihapus permanen.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground"
                                  onClick={() => handleDelete(m.id)}
                                  disabled={deleting === m.id}
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
