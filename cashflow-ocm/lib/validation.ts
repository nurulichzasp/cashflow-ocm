import { z } from 'zod'

export const isoDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus berformat YYYY-MM-DD')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  }, 'Tanggal tidak valid')

export const optionalIsoDateSchema = z.union([isoDateSchema, z.literal('')]).optional()
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Bulan tidak valid')
