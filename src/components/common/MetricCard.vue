<script setup lang="ts">
interface Props {
  label: string
  value: string | number
  hint?: string
  variant?: 'default' | 'primary' | 'success' | 'warning'
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
})
</script>

<template>
  <div class="metric-card" :class="`metric-card--${variant}`">
    <div class="metric-card__label">
      {{ label }}
    </div>
    <div class="metric-card__value">
      {{ value }}
    </div>
    <div v-if="hint" class="metric-card__hint">
      {{ hint }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.metric-card {
  position: relative;
  padding: 18px 20px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid rgba(229, 231, 235, 0.9);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: #d1d5db;
  }

  &--primary::before {
    background: #e0522d;
  }

  &--success::before {
    background: #16a34a;
  }

  &--warning::before {
    background: #f59e0b;
  }
}

.metric-card__label {
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 13px;
  font-weight: 600;
}

.metric-card__value {
  color: #1f2937;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.1;
}

.metric-card__hint {
  margin-top: 6px;
  color: #9ca3af;
  font-size: 12px;
}
</style>
