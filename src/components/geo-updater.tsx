'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { api } from '@/trpc/react'

/**
 * GeoUpdater - 自动检测并更新用户国家代码
 * 
 * 该组件会：
 * 1. 检测用户是否已有 countryCode
 * 2. 如果没有，通过后端 API 从请求 header 获取国家代码
 * 3. 保存到数据库（source = "AUTO"）
 * 
 * 注意：国家代码一旦设置就不会被覆盖（涉及报税合规）。
 * 用户不允许手动修改国家设置。
 */
export function GeoUpdater() {
  const { status } = useSession()
  const { data: profile } = api.account.getProfile.useQuery(undefined, {
    enabled: status === 'authenticated',
  })
  const updateGeo = api.account.autoUpdateGeo.useMutation()
  
  // 用于跟踪是否已经尝试过更新，避免重复调用
  const hasAttemptedUpdate = useRef(false)

  useEffect(() => {
    // 只在用户已登录且已获取到用户资料时执行
    if (status !== 'authenticated' || !profile) return
    
    // 如果已经尝试过更新，不再重复执行
    if (hasAttemptedUpdate.current) return

    // 如果用户已有国家代码，不需要更新
    if (profile.countryCode) return

    // 调用后端 API 更新国家代码
    hasAttemptedUpdate.current = true
    updateGeo.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, profile?.countryCode])

  // 该组件不渲染任何 UI
  return null
}

