import { ListPageSkeleton } from '@/components/skeletons'

// Dashboard Kesehatan Peron: 3 kartu ringkasan (Kritis/Perhatian/Sehat) + daftar.
export default function Loading() {
  return <ListPageSkeleton stats={3} />
}
