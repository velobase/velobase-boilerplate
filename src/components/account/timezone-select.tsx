'use client'

import { useState, useEffect } from 'react'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// 常用时区列表
const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
]

export function TimezoneSelect() {
  const { data: profile } = api.account.getProfile.useQuery()
  const [showSaved, setShowSaved] = useState(false)
  const [savedTimezone, setSavedTimezone] = useState<string>('')
  
  const updateTimezone = api.account.updateTimezone.useMutation({
    onSuccess: () => {
      // Update saved timezone to hide save button
      setSavedTimezone(selectedTimezone)
      
      // Show saved feedback
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 1500)
    },
  })

  const [selectedTimezone, setSelectedTimezone] = useState<string>('')
  const [detectedTimezone, setDetectedTimezone] = useState<string>('')

  // 检测浏览器时区
  useEffect(() => {
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      setDetectedTimezone(browserTz)
    } catch (error) {
      console.error('Failed to detect timezone:', error)
    }
  }, [])

  // 初始化时区（只在首次加载时）
  useEffect(() => {
    if (profile?.timezone && !savedTimezone) {
      setSelectedTimezone(profile.timezone)
      setSavedTimezone(profile.timezone)
    }
  }, [profile, savedTimezone])

  const handleSave = () => {
    if (selectedTimezone && selectedTimezone !== savedTimezone) {
      updateTimezone.mutate({ timezone: selectedTimezone })
    }
  }

  const handleUseDetected = () => {
    if (detectedTimezone) {
      setSelectedTimezone(detectedTimezone)
    }
  }

  const hasChanges = selectedTimezone && selectedTimezone !== savedTimezone
  const isDetectedDifferent = detectedTimezone && detectedTimezone !== savedTimezone

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasChanges && !showSaved && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateTimezone.isPending}
          >
            {updateTimezone.isPending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        )}
        
        {showSaved && (
          <span className={cn(
            "text-sm text-green-600 animate-in fade-in duration-200",
            "flex items-center gap-1"
          )}>
            <Check className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>

      {isDetectedDifferent && (
        <p className="text-xs text-muted-foreground">
          Detected: {detectedTimezone} •{" "}
          <button
            onClick={handleUseDetected}
            className="text-foreground hover:underline font-medium"
          >
            Use this
          </button>
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Used for daily rewards at midnight local time
      </p>
    </div>
  )
}

