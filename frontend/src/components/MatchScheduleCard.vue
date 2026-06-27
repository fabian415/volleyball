<script setup>
import { computed } from 'vue'
import { Shuffle, CheckCircle, Clock, Play, ChevronUp, ChevronDown } from '@lucide/vue'
import { useGame } from '../composables/useGame'

const { state, TEAM_LABELS, TEAM_COLORS, generateTeams, swapMatches } = useGame()

const colorMap = {
  indigo: {
    header: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  rose: {
    header: 'text-rose-600',
    badge: 'bg-rose-100 text-rose-700',
  },
  emerald: {
    header: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
  },
}

const scheduleStarted = computed(() =>
  state.value.matchSchedule?.some(m => m.completed || (m.scoreHome ?? 0) > 0 || (m.scoreAway ?? 0) > 0)
)

function moveMatch(idx, dir) {
  const target = idx + dir
  if (target < 0 || target >= state.value.matchSchedule.length) return
  swapMatches(idx, target)
}

function confirmGenerateTeams() {
  if (confirm('確定要重新分隊嗎？\n目前的隊伍配置將會被清除。')) {
    generateTeams()
  }
}

function getMatchStatus(idx) {
  if (!state.value.matchSchedule?.length) return 'pending'
  const m = state.value.matchSchedule[idx]
  if (!m) return 'pending'
  if (m.completed) return 'done'
  if (idx === state.value.currentMatchIndex) return 'active'
  return 'pending'
}
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-bold text-lg flex items-center gap-2 text-slate-700">
        <Play :size="20" /> 本輪賽程
      </h3>
      <button
        @click="confirmGenerateTeams"
        :disabled="scheduleStarted"
        class="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition flex items-center gap-2 font-bold text-sm shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Shuffle :size="16" /> 重新分隊
      </button>
    </div>

    <div class="space-y-3">
      <div
        v-for="(match, idx) in state.matchSchedule"
        :key="idx"
        :class="[
          'flex items-center justify-between p-4 rounded-2xl border transition',
          getMatchStatus(idx) === 'active'
            ? 'border-indigo-400 bg-indigo-50 shadow-sm'
            : getMatchStatus(idx) === 'done'
            ? 'border-slate-100 bg-slate-50 opacity-70'
            : 'border-slate-100 bg-white'
        ]"
      >
        <div class="flex items-center gap-3">
          <!-- 排序按鈕：開賽前才可調整 -->
          <div v-if="!scheduleStarted" class="flex flex-col">
            <button
              @click="moveMatch(idx, -1)"
              :disabled="idx === 0"
              class="p-2 -m-px text-slate-400 hover:text-indigo-600 active:text-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed transition"
            ><ChevronUp :size="16" /></button>
            <button
              @click="moveMatch(idx, 1)"
              :disabled="idx === state.matchSchedule.length - 1"
              class="p-2 -m-px text-slate-400 hover:text-indigo-600 active:text-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed transition"
            ><ChevronDown :size="16" /></button>
          </div>
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center font-black text-sm',
              getMatchStatus(idx) === 'active'
                ? 'bg-indigo-600 text-white'
                : getMatchStatus(idx) === 'done'
                ? 'bg-green-500 text-white'
                : 'bg-slate-200 text-slate-500'
            ]"
          >
            {{ idx + 1 }}
          </div>
          <div class="flex items-center gap-2 font-bold">
            <span :class="colorMap[TEAM_COLORS[match.home]].header">{{ TEAM_LABELS[match.home] }}</span>
            <span class="text-slate-400 text-sm">vs</span>
            <span :class="colorMap[TEAM_COLORS[match.away]].header">{{ TEAM_LABELS[match.away] }}</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- 完成時顯示比分 + 勝/負隊 -->
          <template v-if="getMatchStatus(idx) === 'done'">
            <div class="flex flex-col items-end gap-1">
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'text-xs font-black px-2 py-0.5 rounded-full',
                    match.scoreHome >= match.scoreAway
                      ? colorMap[TEAM_COLORS[match.home]].badge
                      : 'bg-slate-100 text-slate-400 line-through'
                  ]"
                >{{ TEAM_LABELS[match.home] }}</span>
                <span class="font-black text-slate-700">
                  {{ match.scoreHome }} : {{ match.scoreAway }}
                </span>
                <span
                  :class="[
                    'text-xs font-black px-2 py-0.5 rounded-full',
                    match.scoreAway > match.scoreHome
                      ? colorMap[TEAM_COLORS[match.away]].badge
                      : 'bg-slate-100 text-slate-400 line-through'
                  ]"
                >{{ TEAM_LABELS[match.away] }}</span>
              </div>
              <div class="flex items-center gap-1 text-[10px] font-black text-green-600">
                <CheckCircle :size="12" />
                {{
                  match.scoreHome >= match.scoreAway
                    ? TEAM_LABELS[match.home]
                    : TEAM_LABELS[match.away]
                }} 獲勝
              </div>
            </div>
          </template>
          <!-- 進行中 -->
          <template v-else-if="getMatchStatus(idx) === 'active'">
            <span class="font-black text-indigo-600 text-lg">
              {{ match.scoreHome ?? 0 }} : {{ match.scoreAway ?? 0 }}
            </span>
            <span class="text-xs font-bold text-indigo-500 bg-indigo-100 px-2 py-1 rounded-full animate-pulse">進行中</span>
          </template>
          <!-- 待賽 -->
          <template v-else>
            <Clock :size="18" class="text-slate-400" />
            <span class="text-xs text-slate-400 font-bold">待賽</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
