import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { getRedirectUrl } from 'next/experimental/testing/server'
import { proxy } from '../../proxy'

describe('auth proxy', () => {
  it('melewatkan health check publik tanpa session', () => {
    const response = proxy(new NextRequest('https://omandacerli.com/api/health'))
    expect(response.status).toBe(200)
    expect(getRedirectUrl(response)).toBeNull()
  })

  it('tetap mengarahkan dashboard tanpa session ke login', () => {
    const response = proxy(new NextRequest('https://omandacerli.com/dashboard'))
    expect(response.status).toBe(307)
    expect(getRedirectUrl(response)).toBe(
      'https://omandacerli.com/login?callbackUrl=%2Fdashboard',
    )
  })
})
