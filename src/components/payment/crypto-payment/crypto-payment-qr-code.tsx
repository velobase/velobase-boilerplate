'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'react-qr-code'

interface CryptoPaymentQRCodeProps {
  address: string
  showQR: boolean
  onToggle: () => void
}

export function CryptoPaymentQRCode({ address, showQR, onToggle }: CryptoPaymentQRCodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full flex flex-col items-center"
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        <span>{showQR ? 'Hide QR Code' : 'Show QR Code'}</span>
        {showQR ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 bg-white rounded-[24px] shadow-sm border border-border/60 mt-2 mb-4 relative group">
              <QRCode
                value={address}
                size={160}
                level="M"
                className="w-full h-auto max-w-[160px] sm:max-w-[200px]"
              />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Scan to Pay
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

