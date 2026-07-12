import { redirect } from 'next/navigation'

/** Halaman lama /peron/kesehatan — kini segmen "Kesehatan" di hub /peron. */
export default function KesehatanPeronRedirect() {
  redirect('/peron?view=kesehatan')
}
