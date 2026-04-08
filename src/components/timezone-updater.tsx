'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { api } from '@/trpc/react'

/**
 * TimezoneUpdater - 自动检测并更新用户时区
 * 
 * 该组件会：
 * 1. 检测浏览器时区
 * 2. 对比数据库中存储的时区
 * 3. 如果不同则自动更新
 * 
 * 这确保每日积分发放能够基于用户本地时间的午夜进行。
 */
export function TimezoneUpdater() {
  const { status } = useSession()
  const { data: profile } = api.account.getProfile.useQuery(undefined, {
    enabled: status === 'authenticated',
  })
  const updateTimezone = api.account.updateTimezone.useMutation({
    // 不自动失效缓存，避免触发无限循环
    onSuccess: () => {
      // 静默成功，不触发任何重新获取
    },
  })
  
  // 用于跟踪是否已经尝试过更新时区，避免无限循环
  const hasAttemptedUpdate = useRef(false)

  useEffect(() => {
    // 只在用户已登录且已获取到用户资料时执行
    if (status !== 'authenticated' || !profile) return
    
    // 如果已经尝试过更新，不再重复执行
    if (hasAttemptedUpdate.current) return

    try {
      // 获取浏览器检测到的时区
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      
      // 只在用户时区为默认值（UTC）时才自动更新
      // 这样可以尊重用户的主动设置，避免用户旅行/使用VPN时被误更新
      if (browserTimezone && profile.timezone === 'UTC' && browserTimezone !== 'UTC') {
        hasAttemptedUpdate.current = true
        updateTimezone.mutate({ timezone: browserTimezone })
      }
    } catch (error) {
      // 如果检测失败，静默处理，不影响用户体验
      console.error('Failed to detect or update timezone:', error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, profile?.timezone])

  // 该组件不渲染任何 UI
  return null
}

