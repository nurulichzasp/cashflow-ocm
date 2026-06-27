'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Link2, Copy, Check, MessageCircle, Power, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generatePeronToken, revokePeronToken, type PeronAccessInfo } from '../portal-actions'

export function PortalLinkCard({
  peronId,
  peronNama,
  initial,
  canManage,
}: {
  peronId: string
  peronNama: string
  initial: PeronAccessInfo
  // Buat/rotate/cabut link portal = mempublikasikan data peron ke publik →
  // owner-only (R2). Server tetap menolak via requireOwner(); ini hanya UI.
  canManage: boolean
}) {
  const [access, setAccess] = useState<PeronAccessInfo>(initial)
  const [pending, start] = useTransition()
  const [copied, setCopied] = useState(false)

  const active = access?.isActive ?? false
  const url = access?.url ?? ''

  function generate() {
    start(async () => {
      try {
        const res = await generatePeronToken(peronId)
        setAccess({ token: '', url: res.url, isActive: true, lastViewedAt: null })
        toast.success(initial ? 'Link portal dibuat ulang' : 'Link portal dibuat')
      } catch {
        toast.error('Gagal membuat link')
      }
    })
  }

  function revoke() {
    start(async () => {
      try {
        await revokePeronToken(peronId)
        setAccess((a) => (a ? { ...a, isActive: false } : a))
        toast.success('Link portal dinonaktifkan')
      } catch {
        toast.error('Gagal menonaktifkan')
      }
    })
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      toast.success('Link disalin')
    } catch {
      toast.error('Gagal menyalin')
    }
  }

  const waText = encodeURIComponent(
    `Assalamualaikum ${peronNama}, berikut link laporan setoran & pembayaran dari CV OCM (transparan, bisa dibuka kapan saja):\n${url}`,
  )

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Link2 className="h-4 w-4 text-[var(--brand)]" /> Link Portal Peron
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Halaman read-only untuk {peronNama}: sisa belum dibayar, riwayat setoran & pembayaran. Bagikan via WhatsApp.
        </p>

        {!access || !active ? (
          <div className="space-y-2">
            {access && !active && (
              <p className="text-xs text-warn">Link saat ini nonaktif.</p>
            )}
            {canManage ? (
              <Button size="sm" onClick={generate} disabled={pending} className="gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> {pending ? 'Membuat…' : access ? 'Aktifkan Link Baru' : 'Buat Link Portal'}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Belum ada link portal aktif. Hanya owner yang dapat membuatnya.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{url}</span>
              <button onClick={copy} aria-label="Salin link" className="tap-pad shrink-0 text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                {copied ? <Check className="h-4 w-4 text-[var(--brand)]" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--brand-solid)] px-3 text-[13px] font-semibold text-white hover:brightness-110"
              >
                <MessageCircle className="h-4 w-4" /> Kirim via WhatsApp
              </a>
              {canManage && (
                <>
                  <Button size="sm" variant="outline" onClick={generate} disabled={pending} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Ganti
                  </Button>
                  <Button size="sm" variant="ghost" onClick={revoke} disabled={pending} className="gap-1.5 text-crit">
                    <Power className="h-3.5 w-3.5" /> Nonaktifkan
                  </Button>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {access.lastViewedAt
                ? `Terakhir dibuka peron: ${new Date(access.lastViewedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'Belum pernah dibuka peron.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
