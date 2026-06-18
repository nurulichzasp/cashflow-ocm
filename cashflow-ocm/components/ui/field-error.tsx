import { AlertCircle } from 'lucide-react'

/**
 * Pesan error validasi inline di bawah field. Memakai token semantik --crit
 * (.text-crit / --crit-fg) — merah JELAS & lulus AA, adaptif tema, dan TIDAK
 * ternetralkan catch-all (beda dari --destructive yang sengaja diabukan).
 * role="alert" agar dibacakan screen reader saat muncul.
 */
export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p
      role="alert"
      className="mt-1 flex items-center gap-1 text-xs text-crit"
    >
      <AlertCircle className="h-3 w-3 shrink-0" strokeWidth={2.25} />
      {children}
    </p>
  )
}

/** Kelas border merah untuk field invalid — token --crit-fg (adaptif tema, lulus AA, tak ternetralkan). */
export const invalidFieldClass = '!border-[var(--crit-fg)]'
