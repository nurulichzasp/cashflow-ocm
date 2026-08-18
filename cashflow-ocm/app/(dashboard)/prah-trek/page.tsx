import { getPrahTrekData } from './actions'
import { PrahTrekClient } from './prah-trek-client'

export const dynamic = 'force-dynamic'

export default async function PrahTrekPage() {
  const data = await getPrahTrekData()
  return <PrahTrekClient initialAngkutan={data.angkutan} initialBbm={data.bbm} />
}
