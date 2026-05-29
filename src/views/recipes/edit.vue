<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui'
import type { RecipeDifficulty } from '@/types/admin'
import {
  NButton,
  NCard,
  NDivider,
  NForm,
  NFormItem,
  NImage,
  NInput,
  NInputNumber,
  NRadioButton,
  NRadioGroup,
  NSpin,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminRecipesApi, type UpsertRecipePayload } from '@/api/recipes'
import { useScreen } from '@/composables/useScreen'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const { isMobile } = useScreen()

const id = computed(() => (route.params.id as string | undefined) ?? '')
const isEdit = computed(() => Boolean(id.value))

const formRef = ref<FormInst>()
const submitting = ref(false)
const loading = ref(false)

interface FormState {
  name: string
  category: string
  source: string
  difficulty: RecipeDifficulty
  estimatedMinutes: number
  popularityScore: number
  reasonTemplate: string
  requiredIngredientsInput: string
  optionalIngredientsInput: string
  missingIngredientsInput: string
  instructionsText: string
  stepImagesJson: string
  portionsJson: string
  tips: string
  imageUrl: string
  imageSourceUrl: string
  sourceRefUrl: string
}

const form = reactive<FormState>({
  name: '',
  category: '',
  source: '',
  difficulty: 'easy',
  estimatedMinutes: 15,
  popularityScore: 0,
  reasonTemplate: '',
  requiredIngredientsInput: '',
  optionalIngredientsInput: '',
  missingIngredientsInput: '',
  instructionsText: '',
  stepImagesJson: '',
  portionsJson: '',
  tips: '',
  imageUrl: '',
  imageSourceUrl: '',
  sourceRefUrl: '',
})

// 食材数组用逗号 / 中文逗号 / 换行任意拆分——最贴合粘贴体验
function splitTags(input: string): string[] {
  return input
    .split(/[,，\n]/)
    .map(s => s.trim())
    .filter(Boolean)
}

function joinTags(arr: string[] | null | undefined) {
  return (arr ?? []).join('、')
}

function tryParseJson(value: string): { ok: true, data: Record<string, unknown> | null } | { ok: false, error: string } {
  const trimmed = value.trim()
  if (!trimmed)
    return { ok: true, data: null }
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ok: true, data: parsed as Record<string, unknown> }
    }
    return { ok: false, error: '必须是 JSON 对象({})' }
  }
  catch (err: any) {
    return { ok: false, error: `JSON 解析失败: ${err.message}` }
  }
}

const rules: FormRules = {
  name: [
    { required: true, message: '请输入菜谱名', trigger: 'blur' },
    { min: 1, max: 120, message: '长度 1-120', trigger: 'blur' },
  ],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  estimatedMinutes: [{ required: true, type: 'number', message: '请输入用时', trigger: 'blur' }],
  reasonTemplate: [{ required: true, message: '请输入推荐理由模板', trigger: 'blur' }],
  requiredIngredientsInput: [{
    validator: (_rule, value: string) => {
      const arr = splitTags(value ?? '')
      if (arr.length === 0)
        return new Error('至少要有一项必备食材')
      return true
    },
    trigger: 'blur',
  }],
}

async function load() {
  if (!isEdit.value)
    return
  loading.value = true
  try {
    const res = await adminRecipesApi.getById(id.value)
    const d = res.data
    form.name = d.name
    form.category = d.category ?? ''
    form.source = d.source ?? ''
    form.difficulty = d.difficulty
    form.estimatedMinutes = d.estimatedMinutes
    form.popularityScore = d.popularityScore
    form.reasonTemplate = d.reasonTemplate
    form.requiredIngredientsInput = joinTags(d.requiredIngredients)
    form.optionalIngredientsInput = joinTags(d.optionalIngredients)
    form.missingIngredientsInput = joinTags(d.missingIngredients)
    form.instructionsText = (d.instructions ?? []).join('\n')
    form.stepImagesJson = d.stepImages ? JSON.stringify(d.stepImages, null, 2) : ''
    form.portionsJson = d.portions ? JSON.stringify(d.portions, null, 2) : ''
    form.tips = d.tips ?? ''
    form.imageUrl = d.imageUrl ?? ''
    form.imageSourceUrl = d.imageSourceUrl ?? ''
    form.sourceRefUrl = d.sourceRefUrl ?? ''
  }
  finally {
    loading.value = false
  }
}

async function onSubmit() {
  if (!formRef.value)
    return
  try {
    await formRef.value.validate()
  }
  catch {
    return
  }

  const stepImagesParsed = tryParseJson(form.stepImagesJson)
  if (!stepImagesParsed.ok) {
    message.error(`stepImages: ${stepImagesParsed.error}`)
    return
  }
  const portionsParsed = tryParseJson(form.portionsJson)
  if (!portionsParsed.ok) {
    message.error(`portions: ${portionsParsed.error}`)
    return
  }

  const payload: UpsertRecipePayload = {
    name: form.name.trim(),
    requiredIngredients: splitTags(form.requiredIngredientsInput),
    optionalIngredients: splitTags(form.optionalIngredientsInput),
    missingIngredients: splitTags(form.missingIngredientsInput),
    difficulty: form.difficulty,
    estimatedMinutes: Number(form.estimatedMinutes),
    reasonTemplate: form.reasonTemplate.trim(),
    popularityScore: Number(form.popularityScore),
    source: form.source.trim() || null,
    category: form.category.trim() || null,
    instructions: form.instructionsText.split('\n').map(s => s.trim()).filter(Boolean),
    stepImages: stepImagesParsed.data,
    portions: portionsParsed.data,
    tips: form.tips.trim() || null,
    imageUrl: form.imageUrl.trim() || null,
    imageSourceUrl: form.imageSourceUrl.trim() || null,
    sourceRefUrl: form.sourceRefUrl.trim() || null,
  }

  submitting.value = true
  try {
    if (isEdit.value) {
      await adminRecipesApi.update(id.value, payload)
      message.success('已保存')
    }
    else {
      await adminRecipesApi.create(payload)
      message.success('已创建')
    }
    router.replace({ name: 'recipes' })
  }
  catch (err: any) {
    if (err?.name === 'ApiError')
      return
    message.error('保存失败')
  }
  finally {
    submitting.value = false
  }
}

function goBack() {
  router.replace({ name: 'recipes' })
}

// mobile 上 label 放上方,desktop 左对齐
const labelPlacement = computed(() => isMobile.value ? 'top' : 'left')
const labelWidth = computed(() => isMobile.value ? 'auto' : 120)

onMounted(load)
</script>

<template>
  <NSpin :show="loading">
    <div class="recipe-edit">
      <NCard :bordered="false">
        <template #header>
          <div class="recipe-edit__header">
            <span class="recipe-edit__title">{{ isEdit ? '编辑菜谱' : '新建菜谱' }}</span>
            <NButton text @click="goBack">
              返回列表
            </NButton>
          </div>
        </template>

        <NForm
          ref="formRef"
          :model="form"
          :rules="rules"
          :label-placement="labelPlacement"
          :label-width="labelWidth"
          require-mark-placement="right-hanging"
        >
          <NDivider title-placement="left">
            基本信息
          </NDivider>
          <NFormItem label="菜谱名" path="name">
            <NInput v-model:value="form.name" maxlength="120" show-count placeholder="例:番茄炒蛋" />
          </NFormItem>
          <NFormItem label="分类" path="category">
            <NInput v-model:value="form.category" maxlength="64" placeholder="例:meat_dish / vegetable_dish / staple" />
          </NFormItem>
          <NFormItem label="来源" path="source">
            <NInput v-model:value="form.source" maxlength="64" placeholder="例:seed / howtocook" />
          </NFormItem>
          <NFormItem label="难度" path="difficulty">
            <NRadioGroup v-model:value="form.difficulty">
              <NRadioButton value="easy">
                简单
              </NRadioButton>
              <NRadioButton value="medium">
                中等
              </NRadioButton>
              <NRadioButton value="hard">
                困难
              </NRadioButton>
            </NRadioGroup>
          </NFormItem>
          <NFormItem label="用时(分钟)" path="estimatedMinutes">
            <NInputNumber v-model:value="form.estimatedMinutes" :min="1" :max="600" />
          </NFormItem>
          <NFormItem label="人气分" path="popularityScore">
            <NInputNumber v-model:value="form.popularityScore" :min="0" />
          </NFormItem>
          <NFormItem label="推荐理由" path="reasonTemplate">
            <NInput v-model:value="form.reasonTemplate" maxlength="200" show-count placeholder="例:冰箱里 {ingredients} 都有,15 分钟出锅。" />
          </NFormItem>
          <NFormItem label="小贴士" path="tips">
            <NInput v-model:value="form.tips" type="textarea" :rows="3" maxlength="2000" show-count />
          </NFormItem>

          <NDivider title-placement="left">
            食材
          </NDivider>
          <NFormItem label="必备食材" path="requiredIngredientsInput">
            <NInput
              v-model:value="form.requiredIngredientsInput"
              type="textarea"
              :rows="2"
              placeholder="多个食材用逗号、中文逗号或换行分隔"
            />
          </NFormItem>
          <NFormItem label="可选食材" path="optionalIngredientsInput">
            <NInput
              v-model:value="form.optionalIngredientsInput"
              type="textarea"
              :rows="2"
              placeholder="多个食材用逗号、中文逗号或换行分隔"
            />
          </NFormItem>
          <NFormItem label="允许缺失" path="missingIngredientsInput">
            <NInput
              v-model:value="form.missingIngredientsInput"
              type="textarea"
              :rows="2"
              placeholder="推荐时不扣分的食材"
            />
          </NFormItem>

          <NDivider title-placement="left">
            步骤
          </NDivider>
          <NFormItem label="操作步骤" path="instructionsText">
            <NInput
              v-model:value="form.instructionsText"
              type="textarea"
              :rows="6"
              placeholder="一行一步"
            />
          </NFormItem>
          <NFormItem label="步骤图 JSON" path="stepImagesJson">
            <NInput
              v-model:value="form.stepImagesJson"
              type="textarea"
              :rows="4"
              placeholder="形如 { &quot;3&quot;: [&quot;https://...&quot;], &quot;9&quot;: [&quot;https://...&quot;] },空表示无"
            />
          </NFormItem>
          <NFormItem label="用料计算 JSON" path="portionsJson">
            <NInput
              v-model:value="form.portionsJson"
              type="textarea"
              :rows="4"
              placeholder="形如 { &quot;description&quot;: &quot;...&quot;, &quot;items&quot;: [{ &quot;name&quot;: &quot;白糖&quot;, &quot;amount&quot;: &quot;10 克&quot; }] }"
            />
          </NFormItem>

          <NDivider title-placement="left">
            图片与来源
          </NDivider>
          <NFormItem label="菜谱图 URL" path="imageUrl">
            <div class="recipe-edit__image-row">
              <NInput v-model:value="form.imageUrl" maxlength="500" placeholder="https://..." />
              <NImage
                v-if="form.imageUrl"
                :src="form.imageUrl"
                width="120"
                height="120"
                object-fit="cover"
                class="recipe-edit__preview"
              />
            </div>
          </NFormItem>
          <NFormItem label="图源 URL" path="imageSourceUrl">
            <NInput v-model:value="form.imageSourceUrl" maxlength="500" placeholder="原始 raw URL(fallback 用)" />
          </NFormItem>
          <NFormItem label="教程链接" path="sourceRefUrl">
            <NInput v-model:value="form.sourceRefUrl" maxlength="500" placeholder="原文链接" />
          </NFormItem>

          <NFormItem :show-label="false">
            <NButton type="primary" :loading="submitting" @click="onSubmit">
              {{ isEdit ? '保存修改' : '创建菜谱' }}
            </NButton>
            <NButton style="margin-left: 12px" @click="goBack">
              取消
            </NButton>
          </NFormItem>
        </NForm>
      </NCard>
    </div>
  </NSpin>
</template>

<style scoped lang="scss">
.recipe-edit__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.recipe-edit__title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.recipe-edit__image-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  width: 100%;
}

.recipe-edit__preview {
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
}

@media (max-width: 767px) {
  .recipe-edit__image-row {
    flex-direction: column;
  }
}
</style>
