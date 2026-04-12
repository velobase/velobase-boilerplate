export type BillingAccountType = 'UNDEFINED' | 'QUOTA' | 'CREDIT'
export type BillingSubAccountType =
  | 'UNDEFINED'
  | 'DEFAULT'
  | 'FREE_TRIAL'
  | 'MEMBERSHIP'
  | 'ORDER'
  | 'DAILY_LOGIN'
  | 'FIRST_LOGIN'
  | 'PROMO_CODE'

export type BillingAccountStatus =
  | 'UNDEFINED'
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'DEPLETED'
  | 'INVALID'

export type BillingOperationType =
  | 'UNDEFINED'
  | 'FREEZE'
  | 'CONSUME'
  | 'UNFREEZE'
  | 'GRANT'
  | 'EXPIRE'
  | 'POST_CONSUME'

export type BillingBusinessType =
  | 'UNDEFINED'
  | 'TASK'
  | 'ORDER'
  | 'MEMBERSHIP'
  | 'SUBSCRIPTION'
  | 'FREE_TRIAL'
  | 'ADMIN_GRANT'
  | 'ADMIN_DEDUCT'
  | 'TOKEN_USAGE'

export type BillingRecordStatus = 'UNDEFINED' | 'COMPLETED' | 'FAILED'

export type BillingFreezeStatus = 'UNDEFINED' | 'FROZEN' | 'CONSUMED' | 'UNFROZEN'

export type GrantParams = {
  userId: string
  accountType: BillingAccountType
  subAccountType: BillingSubAccountType
  amount: number
  outerBizId: string
  businessType?: BillingBusinessType
  referenceId?: string
  description?: string
  startsAt?: Date | null
  expiresAt?: Date | null
}

export type GrantOutput = {
  accountId: string
  totalAmount: number
  addedAmount: number
  recordId: string
  isIdempotentReplay: boolean
}

export type FreezeParams = {
  userId: string
  accountType: BillingAccountType
  businessId: string
  businessType: BillingBusinessType
  amount: number
  targetAccountId?: string
  description?: string
}

export type FreezeDetail = {
  freezeId: string
  accountId: string
  accountType: BillingAccountType
  subAccountType: BillingSubAccountType
  amount: number
}

export type FreezeOutput = {
  totalAmount: number
  freezeDetails: FreezeDetail[]
  isIdempotentReplay: boolean
}

export type ConsumeParams = {
  businessId: string
  actualAmount?: number  // Optional: actual amount to consume (defaults to full frozen amount)
}

export type ConsumeDetail = {
  freezeId: string
  accountId: string
  subAccountType: BillingSubAccountType
  amount: number
}

export type ConsumeOutput = {
  totalAmount: number
  returnedAmount?: number  // Amount returned (if actualAmount < frozen)
  consumeDetails: ConsumeDetail[]
  consumedAt: string
}

export type UnfreezeParams = {
  businessId: string
}

export type UnfreezeDetail = {
  freezeId: string
  accountId: string
  subAccountType: BillingSubAccountType
  amount: number
}

export type UnfreezeOutput = {
  totalAmount: number
  unfreezeDetails: UnfreezeDetail[]
  unfrozenAt: string
}

export type GetBalanceParams = {
  userId: string
  accountType?: BillingAccountType
}

export type AccountSummary = {
  accountType: BillingAccountType
  subAccountType: BillingSubAccountType
  creditType?: string
  total: number
  used: number
  frozen: number
  available: number
  startsAt?: Date | null
  expiresAt?: Date | null
}

export type GetBalanceOutput = {
  totalSummary: {
    total: number
    used: number
    frozen: number
    available: number
  }
  accounts: AccountSummary[]
}

export type GetRecordsParams = {
  userId: string
  limit?: number
  cursor?: string
  operationType?: string
  transactionId?: string
}

export type RecordSummary = {
  id: string
  operationType: BillingOperationType
  amount: number
  creditType: string
  transactionId?: string | null
  businessType?: BillingBusinessType | null
  description?: string | null
  accountId: string
  status: BillingRecordStatus
  createdAt: Date
}

export type GetRecordsOutput = {
  records: RecordSummary[]
  total: number
  hasMore: boolean
  nextCursor?: string
}


