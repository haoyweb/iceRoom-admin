<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { AdminRecipeListItem, RecipeDifficulty } from '@/types/admin'
import {
  NButton,
  NCard,
  NDataTable,
  NImage,
  NInput,
  NSelect,
  NSpace,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminRecipesApi, type ListRecipesParams } from '@/api/recipes'
import { useScreen } from '@/composables/useScreen'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const { isMobile } = useScreen()

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

function onRemove(row: AdminRecipeListItem) {
  dialog.warning({
    title: '删除菜谱',
    content: `确认删除菜谱「${row.name}」吗?删除后 C 端推荐将不再出现,但已经入库的食材不受影响。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminRecipesApi.remove(row.id)
        message.success('已删除')
        await loadList()
      }
      catch (err: any) {
        if (err?.name === 'ApiError')
          return
        message.error('删除失败')
      }
    },
  })
}

function difficultyText(d: RecipeDifficulty): string {
  return { easy: '简单', medium: '中等', hard: '困难' }[d]
}

function difficultyType(d: RecipeDifficulty): 'success' | 'warning' | 'error' {
  return { easy: 'success', medium: 'warning', hard: 'error' }[d] as 'success' | 'warning' | 'error'
}

const difficultyOptions = [
  { label: '简单', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '困难', value: 'hard' },
]

const columns = computed<DataTableColumns<AdminRecipeListItem>>(() => [
  {
    title: '封面',
    key: 'imageUrl',
    width: 92,
    render: (row) => {
      if (row.imageUrl) {
        return h(NImage, {
          src: row.imageUrl,
          width: 56,
          height: 56,
          objectFit: 'cover',
          previewDisabled: false,
          style: 'border-radius: 6px; background: #f3f4f6;',
        })
      }
      return h('div', {
        style: 'width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; background: #f3f4f6; border-radius: 6px; color: #9ca3af; font-size: 12px;',
      }, '—')
    },
  },
  { title: '菜谱名', key: 'name', minWidth: 160 },
  {
    title: '分类',
    key: 'category',
    minWidth: 120,
    render: row => row.category || '—',
  },
  {
    title: '难度',
    key: 'difficulty',
    width: 90,
    render: row => h(
      NTag,
      { type: difficultyType(row.difficulty), size: 'small', bordered: false },
      { default: () => difficultyText(row.difficulty) },
    ),
  },
  {
    title: '用时',
    key: 'estimatedMinutes',
    width: 80,
    align: 'center',
    render: row => `${row.estimatedMinutes} 分`,
  },
  { title: '人气', key: 'popularityScore', width: 80, align: 'center' },
  {
    title: '来源',
    key: 'source',
    width: 120,
    render: row => row.source || '—',
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 160,
    render: row => formatDateTime(row.updatedAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 170,
    fixed: 'right',
    render: row => h(NSpace, { size: 4 }, {
      default: () => [
        h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          onClick: (e: Event) => {
            e.stopPropagation()
            goEdit(row)
          },
        }, { default: () => '编辑' }),
        h(NButton, {
          text: true,
          type: 'error',
          size: 'small',
          onClick: (e: Event) => {
            e.stopPropagation()
            onRemove(row)
          },
        }, { default: () => '删除' }),
      ],
    }),
  },
])

const pagination = computed(() => ({
  page: filter.page,
  pageSize: filter.pageSize,
  itemCount: total.value,
  pageSizes: [20, 50, 100],
  showSizePicker: true,
  onUpdatePage: (page: number) => {
    filter.page = page
    void loadList()
  },
  onUpdatePageSize: (pageSize: number) => {
    filter.pageSize = pageSize
    filter.page = 1
    void loadList()
  },
}))

function onRowProps(row: AdminRecipeListItem) {
  return {
    style: 'cursor: pointer;',
    onClick: () => goEdit(row),
  }
}

onMounted(loadList)
</script>

<template>
  <div class="recipes-page">
    <NCard :bordered="false">
      <div class="recipes-page__filter">
        <NInput
          v-model:value="filter.keyword"
          placeholder="搜索菜谱名"
          clearable
          style="width: 220px; max-width: 100%;"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <NInput
          v-model:value="filter.category"
          placeholder="分类(如 meat_dish)"
          clearable
          style="width: 200px;"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <NSelect
          v-model:value="filter.difficulty"
          placeholder="难度"
          clearable
          :options="difficultyOptions"
          style="width: 120px;"
          @update:value="onSearch"
        />
        <NInput
          v-model:value="filter.source"
          placeholder="来源(如 howtocook)"
          clearable
          style="width: 200px;"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <NButton type="primary" @click="onSearch">
          搜索
        </NButton>
        <NButton @click="onReset">
          重置
        </NButton>
        <NButton type="success" class="recipes-page__new" @click="goNew">
          新建菜谱
        </NButton>
      </div>

      <!-- Desktop 表格 -->
      <NDataTable
        v-if="!isMobile"
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        :row-props="onRowProps"
        :scroll-x="1100"
        :bordered="false"
        striped
        remote
      />

      <!-- Mobile 卡片列表 -->
      <div v-else class="recipes-page__cards">
        <div
          v-for="row in list"
          :key="row.id"
          class="recipe-card"
          @click="goEdit(row)"
        >
          <NImage
            v-if="row.imageUrl"
            :src="row.imageUrl"
            width="80"
            height="80"
            object-fit="cover"
            preview-disabled
            class="recipe-card__cover"
          />
          <div v-else class="recipe-card__cover recipe-card__cover--empty">
            —
          </div>
          <div class="recipe-card__body">
            <div class="recipe-card__title">
              {{ row.name }}
            </div>
            <div class="recipe-card__meta">
              <NTag :type="difficultyType(row.difficulty)" size="small" :bordered="false">
                {{ difficultyText(row.difficulty) }}
              </NTag>
              <span>{{ row.estimatedMinutes }} 分钟</span>
              <span>· 人气 {{ row.popularityScore }}</span>
            </div>
            <div class="recipe-card__sub">
              {{ row.category || '—' }} · {{ row.source || '—' }}
            </div>
            <div class="recipe-card__actions">
              <NButton size="tiny" type="primary" @click.stop="goEdit(row)">
                编辑
              </NButton>
              <NButton size="tiny" type="error" @click.stop="onRemove(row)">
                删除
              </NButton>
            </div>
          </div>
        </div>
        <div v-if="!loading && list.length === 0" class="recipes-page__empty">
          暂无菜谱
        </div>
        <div v-if="total > filter.pageSize!" class="recipes-page__mobile-pager">
          <NButton
            size="small"
            :disabled="filter.page === 1"
            @click="() => { filter.page!--; loadList() }"
          >
            上一页
          </NButton>
          <span class="recipes-page__page-indicator">
            {{ filter.page }} / {{ Math.ceil(total / (filter.pageSize ?? 20)) }}
          </span>
          <NButton
            size="small"
            :disabled="filter.page! * (filter.pageSize ?? 20) >= total"
            @click="() => { filter.page!++; loadList() }"
          >
            下一页
          </NButton>
        </div>
      </div>
    </NCard>
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

.recipes-page__cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recipe-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid rgba(229, 231, 235, 0.9);
  border-radius: 10px;
  cursor: pointer;

  &:active {
    background: #fafafa;
  }
}

.recipe-card__cover {
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;

  &--empty {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
  }
}

.recipe-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recipe-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.recipe-card__sub {
  font-size: 12px;
  color: #9ca3af;
}

.recipe-card__actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.recipes-page__empty {
  padding: 40px 0;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.recipes-page__mobile-pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 14px 0 4px;
}

.recipes-page__page-indicator {
  font-size: 13px;
  color: #6b7280;
}

@media (max-width: 767px) {
  .recipes-page__new {
    margin-left: 0;
  }
}
</style>
