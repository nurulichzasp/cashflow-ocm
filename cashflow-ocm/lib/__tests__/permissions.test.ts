import { describe, expect, it } from 'vitest'
import { hasModulePermission, hasUserPermission, parseModulePermissions } from '../permissions'

describe('izin modul server-side', () => {
  it('owner selalu punya akses penuh', () => {
    expect(hasModulePermission({ role: 'owner', permissions: '{"kas":false}' }, 'kas')).toBe(true)
  })

  it('modul yang dimatikan menolak aksi admin', () => {
    const user = { role: 'admin', permissions: '{"pembelian":false}' }
    expect(hasUserPermission(user, 'canCreate', 'pembelian')).toBe(false)
  })

  it('peran custom dapat bekerja hanya pada modul yang dipilih owner', () => {
    const user = { role: 'lapangan', permissions: '{"pembelian":true,"kas":false}' }
    expect(hasUserPermission(user, 'canCreate', 'pembelian')).toBe(true)
    expect(hasUserPermission(user, 'canCreate', 'kas')).toBe(false)
    expect(hasUserPermission(user, 'canManageUsers')).toBe(false)
  })

  it('payload rusak tidak dapat menyisipkan nilai non-boolean', () => {
    expect(parseModulePermissions('{"kas":"yes","__proto__":{"kas":true}}').kas).toBe(false)
    expect(parseModulePermissions('[]').delete).toBe(false)
  })
})
