import { defineConfig } from 'vitest/config'

// Unit test untuk logika MURNI (uang/tanggal/pajak/saldo). Tidak menyentuh DB
// atau Next runtime — fokus jaring pengaman regresi pada perhitungan, yang paling
// berbahaya kalau diam-diam salah di app keuangan.
export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
})
