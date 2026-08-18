import 'server-only'

import { signPrahBastPayload, verifyPrahBastPayload, type PrahProofRow } from '@/lib/prah-bast-proof-core'

function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET
  if (!value) throw new Error('BETTER_AUTH_SECRET tidak dikonfigurasi')
  return value
}

export function signPrahBastImport(noBast: string, rows: PrahProofRow[]): string {
  return signPrahBastPayload(noBast, rows, secret())
}

export function verifyPrahBastImport(noBast: string, rows: PrahProofRow[], proof: string): boolean {
  return verifyPrahBastPayload(noBast, rows, proof, secret())
}
