<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, defineAsyncComponent } from 'vue'

interface SeriesItem {
  name: string
  data: number[]
  color?: string
  yAxisIndex?: number
}

interface Props {
  xAxis: string[]
  series: SeriesItem[]
  height?: number
  dualYAxis?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: 280,
  dualYAxis: false,
  loading: false,
})

// 一次性注册需要的 echarts 模块——保留全局副作用，多次实例化 LineChart 不会重复注册
use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])

// vue-echarts 用 dynamic import 包一下避免 SSR / 初始化阻塞
const VChart = defineAsyncComponent(() => import('vue-echarts'))

const option = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 0, right: 0 },
  grid: { left: 24, right: 24, top: 36, bottom: 24, containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.xAxis,
    axisLine: { lineStyle: { color: '#e5e7eb' } },
    axisLabel: { color: '#6b7280' },
  },
  yAxis: props.dualYAxis
    ? [
        {
          type: 'value',
          axisLine: { lineStyle: { color: '#e5e7eb' } },
          axisLabel: { color: '#6b7280' },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        {
          type: 'value',
          axisLine: { lineStyle: { color: '#e5e7eb' } },
          axisLabel: { color: '#6b7280' },
          splitLine: { show: false },
        },
      ]
    : {
        type: 'value',
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#6b7280' },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
  series: props.series.map(s => ({
    name: s.name,
    type: 'line',
    smooth: true,
    showSymbol: false,
    yAxisIndex: s.yAxisIndex ?? 0,
    data: s.data,
    lineStyle: { width: 2.5 },
    areaStyle: { opacity: 0.08 },
    itemStyle: s.color ? { color: s.color } : undefined,
  })),
}))
</script>

<template>
  <div v-loading="loading" class="line-chart" :style="{ height: `${height}px` }">
    <VChart :option="option" autoresize />
  </div>
</template>

<style scoped lang="scss">
.line-chart {
  width: 100%;
}
</style>
