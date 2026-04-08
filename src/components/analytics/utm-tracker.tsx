'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'visitor_id', 'aclid', 'gclid', 'wbraid', 'gbraid'] as const
const COOKIE_EXPIRY_DAYS = 30

function setCookie(name: string, value: string, days: number) {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

export function UtmTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!searchParams) return

    let hasUtm = false
    UTM_KEYS.forEach((key) => {
      const value = searchParams.get(key)
      if (value) {
        // Special handling for visitor_id -> propeller_visitor_id
        const cookieName = key === 'visitor_id' ? 'propeller_visitor_id' : key
        setCookie(cookieName, value, COOKIE_EXPIRY_DAYS)
        hasUtm = true
      }
    })

    // 如果有任何 UTM 参数，记录首次访问时间
    if (hasUtm) {
      setCookie('utm_first_visit', new Date().toISOString(), COOKIE_EXPIRY_DAYS)
    }
  }, [searchParams])

  return null
}


