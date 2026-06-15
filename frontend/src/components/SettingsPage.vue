<script setup>
import { ref, watch } from 'vue'
import { AlertTriangle, Trash2, RotateCcw, Settings2, CheckCircle } from '@lucide/vue'
import { useGame } from '../composables/useGame'

const { state, updateConfig, resetScores, resetAll } = useGame()

const localMaxScore = ref(state.value.maxScore)
const localDeuceLimit = ref(state.value.deuceLimit)
const configSaved = ref(false)

watch(() => state.value.maxScore, v => { localMaxScore.value = v })
watch(() => state.value.deuceLimit, v => { localDeuceLimit.value = v })

async function saveConfig() {
  await updateConfig({ maxScore: localMaxScore.value, deuceLimit: localDeuceLimit.value })
  configSaved.value = true
  setTimeout(() => { configSaved.value = false }, 2000)
}

// confirmDialog: null | { type: 'scores' | 'all' }
const confirmDialog = ref(null)

function askConfirm(type) {
  confirmDialog.value = { type }
}

async function executeConfirm() {
  const type = confirmDialog.value?.type
  confirmDialog.value = null
  if (type === 'scores') await resetScores()
  else if (type === 'all') await resetAll()
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6 py-2">

    <!-- 遊戲設置 -->
    <div class="bg-white rounded-2xl shadow-sm border p-6">
      <h3 class="font-bold text-lg mb-5 flex items-center gap-2 text-slate-700">
        <Settings2 :size="20" /> 遊戲設置
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label class="block text-sm font-bold text-slate-600 mb-1.5">最高得分 (MAX_SCORE)</label>
          <input
            type="number"
            v-model.number="localMaxScore"
            min="1"
            class="w-full border rounded-xl px-4 py-2.5 text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <p class="text-xs text-slate-400 mt-1">單局達到此分數且領先 2 分時結束</p>
        </div>
        <div>
          <label class="block text-sm font-bold text-slate-600 mb-1.5">延長賽上限 (DEUCE_LIMIT)</label>
          <input
            type="number"
            v-model.number="localDeuceLimit"
            min="1"
            class="w-full border rounded-xl px-4 py-2.5 text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <p class="text-xs text-slate-400 mt-1">任一方達到此分數時強制結束</p>
        </div>
      </div>

      <div class="mt-5 flex items-center gap-3">
        <button
          @click="saveConfig"
          class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition font-bold text-sm shadow-md"
        >
          儲存設置
        </button>
        <Transition
          enter-active-class="transition duration-200"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-200"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <span v-if="configSaved" class="flex items-center gap-1.5 text-sm font-bold text-green-600">
            <CheckCircle :size="16" /> 已儲存
          </span>
        </Transition>
      </div>
    </div>

    <!-- 危險區域 -->
    <div class="rounded-2xl border-2 border-red-200 bg-red-50/40 p-6">
      <h3 class="font-bold text-lg mb-1 flex items-center gap-2 text-red-600">
        <AlertTriangle :size="20" /> 危險區域
      </h3>
      <p class="text-sm text-red-400 mb-5">以下操作不可復原，請謹慎使用。</p>

      <div class="space-y-4">
        <!-- 歸零所有比分 -->
        <div class="flex items-start justify-between gap-4 bg-white rounded-xl border border-red-100 p-4">
          <div>
            <div class="font-bold text-slate-800 flex items-center gap-2">
              <RotateCcw :size="16" class="text-orange-500" /> 歸零所有比分
            </div>
            <p class="text-xs text-slate-400 mt-0.5">將所有球員積分及賽程分數歸零，球員名單保留。</p>
          </div>
          <button
            @click="askConfirm('scores')"
            class="flex-shrink-0 bg-orange-500 text-white px-4 py-2 rounded-xl hover:bg-orange-600 active:scale-95 transition font-bold text-sm"
          >
            歸零比分
          </button>
        </div>

        <!-- 刪除所有資料 -->
        <div class="flex items-start justify-between gap-4 bg-white rounded-xl border border-red-100 p-4">
          <div>
            <div class="font-bold text-slate-800 flex items-center gap-2">
              <Trash2 :size="16" class="text-red-500" /> 刪除所有資料
            </div>
            <p class="text-xs text-slate-400 mt-0.5">永久刪除所有球員、獎項及比賽紀錄，系統恢復至初始狀態。</p>
          </div>
          <button
            @click="askConfirm('all')"
            class="flex-shrink-0 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 active:scale-95 transition font-bold text-sm"
          >
            刪除資料
          </button>
        </div>
      </div>
    </div>

    <!-- 確認對話框 -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="confirmDialog" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/30" @click="confirmDialog = null" />
        <div class="relative bg-white rounded-2xl shadow-2xl border p-6 max-w-sm w-full">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center bg-red-100">
              <AlertTriangle :size="20" class="text-red-600" />
            </div>
            <h4 class="font-black text-slate-800 text-lg">
              {{ confirmDialog.type === 'scores' ? '確認歸零比分？' : '確認刪除所有資料？' }}
            </h4>
          </div>
          <p class="text-sm text-slate-500 mb-5 leading-relaxed">
            <template v-if="confirmDialog.type === 'scores'">
              所有球員積分將重置為 <strong>0</strong>，賽程記錄也將被清除。此操作<strong class="text-red-600">無法復原</strong>。
            </template>
            <template v-else>
              所有球員、獎項及比賽紀錄將被<strong>永久刪除</strong>，系統恢復初始狀態。此操作<strong class="text-red-600">無法復原</strong>。
            </template>
          </p>
          <div class="flex gap-3">
            <button
              @click="confirmDialog = null"
              class="flex-1 border rounded-xl py-2.5 font-bold text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              取消
            </button>
            <button
              @click="executeConfirm"
              :class="[
                'flex-1 rounded-xl py-2.5 font-bold text-sm text-white transition active:scale-95',
                confirmDialog.type === 'scores' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-600 hover:bg-red-700'
              ]"
            >
              {{ confirmDialog.type === 'scores' ? '確認歸零' : '確認刪除' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>
