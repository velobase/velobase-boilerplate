'use client'

import { Info } from 'lucide-react'
import { api } from '@/trpc/react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Common country code to name mapping
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  BE: 'Belgium',
  AT: 'Austria',
  CH: 'Switzerland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  PL: 'Poland',
  CZ: 'Czech Republic',
  PT: 'Portugal',
  IE: 'Ireland',
  GR: 'Greece',
  RO: 'Romania',
  HU: 'Hungary',
  BG: 'Bulgaria',
  HR: 'Croatia',
  SK: 'Slovakia',
  SI: 'Slovenia',
  LT: 'Lithuania',
  LV: 'Latvia',
  EE: 'Estonia',
  CY: 'Cyprus',
  MT: 'Malta',
  LU: 'Luxembourg',
  IS: 'Iceland',
  LI: 'Liechtenstein',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  JP: 'Japan',
  KR: 'South Korea',
  CN: 'China',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  SG: 'Singapore',
  MY: 'Malaysia',
  TH: 'Thailand',
  VN: 'Vietnam',
  ID: 'Indonesia',
  PH: 'Philippines',
  IN: 'India',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  IL: 'Israel',
  TR: 'Turkey',
  RU: 'Russia',
  UA: 'Ukraine',
  BR: 'Brazil',
  MX: 'Mexico',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  ZA: 'South Africa',
  NG: 'Nigeria',
  EG: 'Egypt',
  KE: 'Kenya',
}

function getCountryName(code: string | null | undefined): string {
  if (!code) return 'Not detected'
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase()
}

function getCountryFlag(code: string | null | undefined): string {
  if (code?.length !== 2) return '🌍'
  // Convert country code to flag emoji
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

/**
 * CountryDisplay - 显示用户国家/地区（只读）
 * 
 * 国家代码由系统自动检测，用户不允许修改。
 * 这涉及到公司报税合规问题。
 */
export function CountryDisplay() {
  const { data: profile, isLoading } = api.account.getProfile.useQuery()

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-[200px]" />
      </div>
    )
  }

  const countryCode = profile?.countryCode
  const countryName = getCountryName(countryCode)
  const flag = getCountryFlag(countryCode)

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border">
        <span className="text-lg">{flag}</span>
        <span className="text-sm font-medium">{countryName}</span>
        {countryCode && (
          <span className="text-xs text-muted-foreground">({countryCode})</span>
        )}
      </div>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Info className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px]">
            <p className="text-xs">
              Your country/region is automatically detected and cannot be changed. 
              This is required for tax compliance purposes.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

