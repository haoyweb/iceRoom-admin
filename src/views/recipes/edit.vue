<script setup lang="ts">
import type { RecipeDifficulty } from '@/types/admin'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminRecipesApi, type UpsertRecipePayload } from '@/api/recipes'

const route = useRoute()
const router = useRouter()

const id = computed(() => (route.params.id as string | undefined) ?? '')
const isEdit = computed(() => Boolean(id.value))

const formRef = ref<FormInstance>()
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
    return { ok: false, error: '必须是 JSON 对象（{}）' }
  }
  catch (err: any) {
    return { ok: false, error: `JSON 解析失败: ${err.message}` }
  }
}

const rules: FormRules<FormState> = {
  name: [{ required: true, message: '请输入菜谱名', trigger: 'blur' }, { min: 1, max: 120, message: '长度 1-120', trigger: 'blur' }],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  estimatedMinutes: [{ required: true, type: 'number', message: '请输入用时', trigger: 'blur' }],
  reasonTemplate: [{ required: true, message: '请输入推荐理由模板', trigger: 'blur' }],
  requiredIngredientsInput: [{
    validator: (_rule, value: string, cb) => {
      const arr = splitTags(value ?? '')
      if (arr.length === 0)
        cb(new Error('至少要有一项必备食材'))
      else cb()
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
  const ok = await formRef.value.validate().catch(() => false)
  if (!ok)
    return

  const stepImagesParsed = tryParseJson(form.stepImagesJson)
  if (!stepImagesParsed.ok) {
    ElMessage.error(`stepImages: ${stepImagesParsed.error}`)
    return
  }
  const portionsParsed = tryParseJson(form.portionsJson)
  if (!portionsParsed.ok) {
    ElMessage.error(`portions: ${portionsParsed.error}`)
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
      ElMessage.success('已保存')
    }
    else {
      await adminRecipesApi.create(payload)
      ElMessage.success('已创建')
    }
    router.replace({ name: 'recipes' })
  }
  catch (err: any) {
    if (err?.name === 'ApiError')
      return
    ElMessage.error('保存失败')
  }
  finally {
    submitting.value = false
  }
}

function goBack() {
  router.replace({ name: 'recipes' })
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="recipe-edit">
    <ElCard shadow="never">
      <template #header>
        <div class="recipe-edit__header">
          <span class="recipe-edit__title">{{ isEdit ? '编辑菜谱' : '新建菜谱' }}</span>
          <ElButton link @click="goBack">
            返回列表
          </ElButton>
        </div>
      </template>

      <ElForm ref="formRef" :model="form" :rules="rules" label-width="120px" label-position="right">
        <ElDivider content-position="left">
          基本信息
        </ElDivider>
        <ElFormItem label="菜谱名" prop="name">
          <ElInput v-model="form.name" maxlength="120" show-word-limit placeholder="例：番茄炒蛋" />
        </ElFormItem>
        <ElFormItem label="分类">
          <ElInput v-model="form.category" maxlength="64" placeholder="例：meat_dish / vegetable_dish / staple" />
        </ElFormItem>
        <ElFormItem label="来源">
          <ElInput v-model="form.source" maxlength="64" placeholder="例：seed / howtocook" />
        </ElFormItem>
        <ElFormItem label="难度" prop="difficulty">
          <ElRadioGroup v-model="form.difficulty">
            <ElRadioButton value="easy">
              简单
            </ElRadioButton>
            <ElRadioButton value="medium">
              中等
            </ElRadioButton>
            <ElRadioButton value="hard">
              困难
            </ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="用时（分钟）" prop="estimatedMinutes">
          <ElInputNumber v-model="form.estimatedMinutes" :min="1" :max="600" />
        </ElFormItem>
        <ElFormItem label="人气分">
          <ElInputNumber v-model="form.popularityScore" :min="0" />
        </ElFormItem>
        <ElFormItem label="推荐理由" prop="reasonTemplate">
          <ElInput v-model="form.reasonTemplate" maxlength="200" show-word-limit placeholder="例：冰箱里 {ingredients} 都有，15 分钟出锅。" />
        </ElFormItem>
        <ElFormItem label="小贴士">
          <ElInput v-model="form.tips" type="textarea" :rows="3" maxlength="2000" show-word-limit />
        </ElFormItem>

        <ElDivider content-position="left">
          食材
        </ElDivider>
        <ElFormItem label="必备食材" prop="requiredIngredientsInput">
          <ElInput
            v-model="form.requiredIngredientsInput"
            type="textarea"
            :rows="2"
            placeholder="多个食材用逗号、中文逗号或换行分隔"
          />
        </ElFormItem>
        <ElFormItem label="可选食材">
          <ElInput
            v-model="form.optionalIngredientsInput"
            type="textarea"
            :rows="2"
            placeholder="多个食材用逗号、中文逗号或换行分隔"
          />
        </ElFormItem>
        <ElFormItem label="允许缺失">
          <ElInput
            v-model="form.missingIngredientsInput"
            type="textarea"
            :rows="2"
            placeholder="推荐时不扣分的食材"
          />
        </ElFormItem>

        <ElDivider content-position="left">
          步骤
        </ElDivider>
        <ElFormItem label="操作步骤">
          <ElInput
            v-model="form.instructionsText"
            type="textarea"
            :rows="6"
            placeholder="一行一步"
          />
        </ElFormItem>
        <ElFormItem label="步骤图 JSON">
          <ElInput
            v-model="form.stepImagesJson"
            type="textarea"
            :rows="4"
            placeholder="形如 { &quot;3&quot;: [&quot;https://...&quot;], &quot;9&quot;: [&quot;https://...&quot;] }，空表示无"
          />
        </ElFormItem>
        <ElFormItem label="用料计算 JSON">
          <ElInput
            v-model="form.portionsJson"
            type="textarea"
            :rows="4"
            placeholder="形如 { &quot;description&quot;: &quot;...&quot;, &quot;items&quot;: [{ &quot;name&quot;: &quot;白糖&quot;, &quot;amount&quot;: &quot;10 克&quot; }] }"
          />
        </ElFormItem>

        <ElDivider content-position="left">
          图片与来源
        </ElDivider>
        <ElFormItem label="菜谱图 URL">
          <div class="recipe-edit__image-row">
            <ElInput v-model="form.imageUrl" maxlength="500" placeholder="https://..." />
            <ElImage v-if="form.imageUrl" :src="form.imageUrl" fit="cover" class="recipe-edit__preview" :preview-src-list="[form.imageUrl]" />
          </div>
        </ElFormItem>
        <ElFormItem label="图源 URL">
          <ElInput v-model="form.imageSourceUrl" maxlength="500" placeholder="原始 raw URL（fallback 用）" />
        </ElFormItem>
        <ElFormItem label="教程链接">
          <ElInput v-model="form.sourceRefUrl" maxlength="500" placeholder="原文链接" />
        </ElFormItem>

        <ElFormItem>
          <ElButton type="primary" :loading="submitting" @click="onSubmit">
            {{ isEdit ? '保存修改' : '创建菜谱' }}
          </ElButton>
          <ElButton @click="goBack">
            取消
          </ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>
  </div>
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
  width: 120px;
  height: 120px;
  border-radius: 6px;
}
</style>
