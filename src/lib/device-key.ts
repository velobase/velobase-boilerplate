'use client'

import { v4 as uuidv4 } from 'uuid'

const LS_KEY = 'app_device_key'
const COOKIE_NAME = 'app_device_key'
const COOKIE_EXPIRY_DAYS = 365

function setCookie(name: string, value: string, days: number) {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

/**
 * Ensure a stable per-device key stored in both localStorage and cookies.
 *
 * - localStorage: survives across sessions until user clears storage
 * - cookie: sent to server for device-level anti-abuse logic
 *
 * Returns the current device key, or null if unavailable (e.g. in SSR).
 */
export function ensureDeviceKey(): string | null {
  if (typeof window === 'undefined') return null

  try {
    let key = window.localStorage.getItem(LS_KEY)

    if (!key) {
      key = uuidv4()
      window.localStorage.setItem(LS_KEY, key)
    }

    // Sync to cookie so server-side logic can read it
    setCookie(COOKIE_NAME, key, COOKIE_EXPIRY_DAYS)

    return key
  } catch {
    // Swallow errors (e.g. disabled storage) to avoid breaking UX
    return null
  }
}

export function getDeviceKeyFromBrowser(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const existing = window.localStorage.getItem(LS_KEY)
    if (existing) {
      // Ensure cookie stays in sync
      setCookie(COOKIE_NAME, existing, COOKIE_EXPIRY_DAYS)
      return existing
    }

    return ensureDeviceKey()
  } catch {
    return null
  }
}


