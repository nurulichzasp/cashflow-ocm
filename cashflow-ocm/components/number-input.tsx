'use client'

import { forwardRef, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number | string
  onChange?: (value: number) => void
}

/** Input angka dengan format ribuan otomatis. Menyimpan raw number ke hidden input. */
const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, name, className, ...props }, ref) => {
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) || 0 : (value ?? 0)

    const [display, setDisplay] = useState(formatThousands(numericValue))

    useEffect(() => {
      setDisplay(formatThousands(numericValue))
    }, [numericValue])

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
      const num = parseInt(raw, 10) || 0
      setDisplay(formatThousands(num))
      onChange?.(num)
    }

    return (
      <>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          className={cn('text-right', className)}
          {...props}
        />
        {/* Hidden input untuk form submission */}
        {name && <input type="hidden" name={name} value={numericValue} />}
      </>
    )
  }
)
NumberInput.displayName = 'NumberInput'

function formatThousands(n: number): string {
  if (!n) return ''
  return n.toLocaleString('id-ID')
}

export { NumberInput }
