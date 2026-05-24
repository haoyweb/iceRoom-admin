/**
 * 与后端 Prisma enum 镜像同步。
 *
 * 不直接 import Prisma 类型——admin 是独立项目，不依赖后端代码。
 * 后端字段变更时手动同步这里（频次很低，比维护 prisma client 共享包简单）。
 */
export type UserRole = 'user' | 'admin' | 'super_admin'
export type UserStatus = 'active' | 'banned'

export type VisionRecognitionStatus = 'pending' | 'success' | 'failed'

export type RecipeDifficulty = 'easy' | 'medium' | 'hard'

/**
 * 后端 ResponseInterceptor 统一包装格式。
 * data 在错误时可能为 null，正常返回时一定有值。
 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
  path: string
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface AuthUserPublic {
  id: string
  username: string
  nickname: string | null
  avatar: string | null
  role: UserRole
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface AuthLoginResponse {
  token: string
  refreshToken: string
  userInfo: AuthUserPublic
}

export interface AdminUserListItem {
  id: string
  username: string
  nickname: string | null
  avatar: string | null
  role: UserRole
  status: UserStatus
  bannedAt: string | null
  banReason: string | null
  createdAt: string
  updatedAt: string
  visionDailyLimit: number
  fridgeCount: number
  visionJobCount: number
}

export interface AdminUserDetail extends AdminUserListItem {
  foodCount: number
}

export interface AdminRecipeListItem {
  id: string
  name: string
  difficulty: RecipeDifficulty
  estimatedMinutes: number
  popularityScore: number
  source: string | null
  category: string | null
  imageUrl: string | null
  updatedAt: string
}

export interface AdminRecipeDetail extends AdminRecipeListItem {
  requiredIngredients: string[]
  optionalIngredients: string[]
  missingIngredients: string[]
  reasonTemplate: string
  instructions: string[]
  stepImages: Record<string, unknown> | null
  portions: Record<string, unknown> | null
  tips: string | null
  imageSourceUrl: string | null
  sourceRefUrl: string | null
  createdAt: string
}

export interface AdminVisionJobListItem {
  id: string
  userId: string
  username: string
  nickname: string | null
  fridgeId: string | null
  status: VisionRecognitionStatus
  requestedSourceType: string
  detectedSourceType: string | null
  provider: string | null
  model: string | null
  itemCount: number
  imageUrl: string | null
  imageExpiresAt: string | null
  errorMessage: string | null
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  costUSD: string | null
  confirmedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminVisionJobDetail extends AdminVisionJobListItem {
  items: Array<Record<string, any>>
  ignored: Array<{ text: string, reason: string }>
  warnings: string[]
  user: {
    id: string
    username: string
    nickname: string | null
    avatar: string | null
  }
}

export interface AdminVisionStats {
  totalJobs: number
  successCount: number
  failedCount: number
  totalTokens: number
  totalCostUSD: string
  providerBreakdown: Array<{
    provider: string
    jobCount: number
    totalTokens: number
    totalCostUSD: string
  }>
}

export interface AdminSettings {
  registration: {
    enabled: boolean
  }
}

export interface DashboardOverview {
  userCount: number
  activeUserCount7d: number
  foodCount: number
  visionJobCount: number
  todayCostUSD: string
  totalCostUSD: string
}

export interface DashboardTrendPoint {
  date: string
  newUsers?: number
  activeUsers?: number
  addedFoods?: number
  jobs?: number
  successJobs?: number
  costUSD?: string
}
