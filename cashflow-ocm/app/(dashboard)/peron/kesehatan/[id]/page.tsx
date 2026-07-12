import { redirect } from 'next/navigation'

/** Halaman lama /peron/kesehatan/[id] — kini tab "Kesehatan" di /peron/[id]. */
export default async function PeronHealthDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/peron/${id}?tab=kesehatan`)
}
