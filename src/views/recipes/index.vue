<script setup lang="ts">
import type { AdminRecipeListItem, RecipeDifficulty } from '@/types/admin'
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminRecipesApi, type ListRecipesParams } from '@/api/recipes'
import { formatDateTime } from '@/utils/format'

const router = useRouter()

const filter = reactive<ListRecipesParams>({
  page: 1,
  pageSize: 20,
  keyword: '',
  category: '',
  difficulty: undefined,
  source: '',
})

const list = ref<AdminRecipeListItem[]>([])
const total = ref(0)
const loading = ref(false)

async function loadList() {
  loading.value = true
  try {
    const res = await adminRecipesApi.list({
      page: filter.page,
      pageSize: filter.pageSize,
      keyword: filter.keyword?.trim() || undefined,
      category: filter.category?.trim() || undefined,
      source: filter.source?.trim() || undefined,
      difficulty: filter.difficulty,
    })
    list.value = res.data.list
    total.value = res.data.total
  }
  finally {
    loading.value = false
  }
}

function onSearch() {
  filter.page = 1
  void loadList()
}

function onReset() {
  filter.keyword = ''
  filter.category = ''
  filter.source = ''
  filter.difficulty = undefined
  filter.page = 1
  void loadList()
}

function goNew() {
  router.push({ name: 'recipe-new' })
}

function goEdit(row: AdminRecipeListItem) {
  router.push({ name: 'recipe-edit', params: { id: row.id } })
}

async function onRemove(row: AdminRecipeListItem) {
  try {
    await ElMessageBox.confirm(
      `确认删除菜谱「${row.name}」吗？删除后 C 端推荐将不再出现，但已经入库的食材不受影响。`,
      '删除菜谱',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
        type: 'warning',
      },
    )
    await adminRecipesApi.remove(row.id)
    ElMessage.success('已删除')
    await loadList()
  }
  catch (err: any) {
    if (err === 'cancel')
      return
    if (err?.name === 'ApiError')
      return
    ElMessage.error('删除失败')
  }
}

function difficultyText(d: RecipeDifficulty): string {
  return { easy: '简单', medium: '中等', hard: '困难' }[d]
}

function difficultyType(d: RecipeDifficulty): 'success' | 'warning' | 'danger' {
  return { easy: 'success', medium: 'warning', hard: 'danger' }[d] as 'success' | 'warning' | 'danger'
}

onMounted(loadList)
</script>

<template>
  <div class="recipes-page">
    <ElCard shadow="never">
      <div class="recipes-page__filter">
        <ElInput
          v-model="filter.keyword"
          placeholder="搜索菜谱名"
          clearable
          style="width: 220px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <ElInput
          v-model="filter.category"
          placeholder="分类（如 meat_dish）"
          clearable
          style="width: 200px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <ElSelect
          v-model="filter.difficulty"
          placeholder="难度"
          clearable
          style="width: 120px"
          @change="onSearch"
        >
          <ElOption label="简单" value="easy" />
          <ElOption label="中等" value="medium" />
          <ElOption label="困难" value="hard" />
        </ElSelect>
        <ElInput
          v-model="filter.source"
          placeholder="来源（如 howtocook）"
          clearable
          style="width: 200px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <ElButton type="primary" @click="onSearch">
          搜索
        </ElButton>
        <ElButton @click="onReset">
          重置
        </ElButton>
        <ElButton type="success" class="recipes-page__new" @click="goNew">
          新建菜谱
        </ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" stripe row-key="id" @row-click="goEdit">
        <ElTableColumn label="封面" width="92">
          <template #default="{ row }">
            <ElImage
              v-if="row.imageUrl"
              :src="row.imageUrl"
              fit="cover"
              lazy
              class="recipes-page__thumb"
              :preview-src-list="[row.imageUrl]"
              hide-on-click-modal
            />
            <div v-else class="recipes-page__thumb recipes-page__thumb--empty">
              —
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="菜谱名" prop="name" min-width="160" />
        <ElTableColumn label="分类" min-width="120">
          <template #default="{ row }">
            {{ row.category || '—' }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="难度" width="90">
          <template #default="{ row }">
            <ElTag :type="difficultyType(row.difficulty)" size="small">
              {{ difficultyText(row.difficulty) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="用时" width="80" align="center">
          <template #default="{ row }">
            {{ row.estimatedMinutes }} 分
          </template>
        </ElTableColumn>
        <ElTableColumn label="人气" prop="popularityScore" width="80" align="center" />
        <ElTableColumn label="来源" width="120">
          <template #default="{ row }">
            {{ row.source || '—' }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="更新时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.updatedAt) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <ElButton link size="small" type="primary" @click.stop="goEdit(row)">
              编辑
            </ElButton>
            <ElButton link size="small" type="danger" @click.stop="onRemove(row)">
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="recipes-page__pagination">
        <ElPagination
          v-model:current-page="filter.page"
          v-model:page-size="filter.pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @current-change="loadList"
          @size-change="loadList"
        />
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.recipes-page__filter {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.recipes-page__new {
  margin-left: auto;
}

.recipes-page__thumb {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  background: #f3f4f6;
}

.recipes-page__thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 12px;
}

.recipes-page__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
