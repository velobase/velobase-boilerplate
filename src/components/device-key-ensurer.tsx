"use client";

import { useEffect } from "react";
import { ensureDeviceKey } from "@/lib/device-key";

/**
 * Ensures we always have a stable per-device key for anti-abuse / device-level logic.
 *
 * This is considered "necessary" for core product security.
 */
export function DeviceKeyEnsurer() {
  useEffect(() => {
    ensureDeviceKey();
  }, []);

  return null;
}


