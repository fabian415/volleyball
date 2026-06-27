<script setup>
import { ref, onMounted } from 'vue'
import { Settings, Users, AlertCircle } from '@lucide/vue'
import { useGame } from '../composables/useGame'

const { setup } = useGame()

const config = ref({ maxScore: 25, deuceLimit: 27, playerCount: 0 })
const loading = ref(true)

async function fetchConfig() {
  loading.value = true
  const res = await fetch('/api/config')
  config.value = await res.json()
  loading.value = false
}

async function handleSetup() {
  if (config.value.playerCount === 0) return
  await setup()
}

onMounted(fetchConfig)
</script>

<template>
  <div class="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border border-slate-200">
    <div class="flex items-center gap-2 mb-6 text-indigo-600">
      <Settings :size="20" />
      <h2 class="text-xl font-semibold">賽事前置設定</h2>
    </div>

    <div class="space-y-6">
      <!-- 賽制（唯讀，來自 .env） -->
      <div>
        <p class="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wide">賽制規則</p>
        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 bg-slate-50 rounded-xl border text-center">
            <div class="text-xs font-bold text-slate-400 mb-1 uppercase">目標分數</div>
            <div class="text-3xl font-black text-indigo-600">{{ config.maxScore }}</div>
          </div>
          <div class="p-4 bg-slate-50 rounded-xl border text-center">
            <div class="text-xs font-bold text-slate-400 mb-1 uppercase">Deuce 上限</div>
            <div class="text-3xl font-black text-indigo-600">{{ config.deuceLimit }}</div>
          </div>
        </div>
      </div>

      <!-- 報名人數 -->
      <div
        :class="[
          'flex items-center gap-4 p-4 rounded-xl border',
          config.playerCount > 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
        ]"
      >
        <component
          :is="config.playerCount > 0 ? Users : AlertCircle"
          :size="24"
          :class="config.playerCount > 0 ? 'text-green-600' : 'text-amber-500'"
        />
        <div>
          <div class="text-xs font-bold text-slate-500 uppercase mb-0.5">已報名選手</div>
          <div :class="['text-3xl font-black', config.playerCount > 0 ? 'text-green-600' : 'text-amber-500']">
            {{ config.playerCount }} 人
          </div>
        </div>
        <div v-if="config.playerCount === 0" class="ml-auto text-sm text-amber-600 font-bold">
          請先至「選手管理」新增選手
        </div>
      </div>

      <button
        @click="handleSetup"
        :disabled="config.playerCount === 0 || loading"
        class="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
      >
        開始賽事
      </button>
    </div>
  </div>
</template>
