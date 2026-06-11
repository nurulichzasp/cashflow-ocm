import { AlertCircle } from 'lucide-react'

/**
 * Pesan error validasi inline di bawah field. Memakai hex merah eksplisit
 * (#DC2626 / #F87171) agar JELAS terlihat — token --destructive sengaja
 * dinetralkan abu di sistem ini, jadi text-destructive tak akan merah.
 * role="alert" agar dibacakan screen reader saat muncul.
 */
export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p
      role="alert"
      className="mt-1 flex items-center gap-1 text-xs text-[#DC2626] dark:text-[#F87171]"
    >
      <AlertCircle className="h-3 w-3 shrink-0" strokeWidth={2.25} />
      {children}
    </p>
  )
}

/** Kelas border merah untuk field invalid (bypass netralisasi catch-all). */
export const invalidFieldClass = '!border-[#DC2626] dark:!border-[#F87171]'
