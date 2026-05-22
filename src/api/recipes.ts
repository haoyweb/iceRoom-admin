import type { AdminRecipeDetail, AdminRecipeListItem, ApiResponse, PageResult, RecipeDifficulty } from '@/types/admin'
import { alovaClient } from './client'

export interface ListRecipesParams {
  page?: number
  pageSize?: number
  keyword?: string
  category?: string
  difficulty?: RecipeDifficulty
  source?: string
}

export interface UpsertRecipePayload {
  name: string
  requiredIngredients: string[]
  optionalIngredients?: string[]
  missingIngredients?: string[]
  difficulty: RecipeDifficulty
  estimatedMinutes: number
  reasonTemplate: string
  popularityScore?: number
  source?: string | null
  category?: string | null
  instructions?: string[]
  stepImages?: Record<string, unknown> | null
  portions?: Record<string, unknown> | null
  tips?: string | null
  imageUrl?: string | null
  imageSourceUrl?: string | null
  sourceRefUrl?: string | null
}

export const adminRecipesApi = {
  list(params: ListRecipesParams) {
    return alovaClient.Get<ApiResponse<PageResult<AdminRecipeListItem>>>('/admin/recipes', { params })
  },
  getById(id: string) {
    return alovaClient.Get<ApiResponse<AdminRecipeDetail>>(`/admin/recipes/${id}`)
  },
  create(payload: UpsertRecipePayload) {
    return alovaClient.Post<ApiResponse<AdminRecipeDetail>>('/admin/recipes', payload)
  },
  update(id: string, payload: Partial<UpsertRecipePayload>) {
    return alovaClient.Patch<ApiResponse<AdminRecipeDetail>>(`/admin/recipes/${id}`, payload)
  },
  remove(id: string) {
    return alovaClient.Delete<ApiResponse<{ id: string, deleted: true }>>(`/admin/recipes/${id}`)
  },
}
