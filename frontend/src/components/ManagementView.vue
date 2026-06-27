<script setup>
import { computed, onMounted } from 'vue'
import { Users, Utensils, Shuffle, Monitor, CheckCircle, Clock, Play, ChevronUp, ChevronDown } from '@lucide/vue'
import { useGame } from '../composables/useGame'

const { state, sortedPlayers, teamPlayers, TEAM_LABELS, TEAM_COLORS, updatePlayer, updatePrize, generateTeams, swapMatches, setView, fetchState, usePolling } = useGame()
onMounted(fetchState)
usePolling()

const TEAM_KEYS = ['teamA', 'teamB', 'teamC']

const colorMap = {
  indigo: {
    header: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700',
    card: 'border-indigo-200 bg-indigo-50/30',
    dot: 'bg-indigo-500',
  },
  rose: {
    header: 'text-rose-600',
    badge: 'bg-rose-100 text-rose-700',
    card: 'border-rose-200 bg-rose-50/30',
    dot: 'bg-rose-500',
  },
  emerald: {
    header: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    card: 'border-emerald-200 bg-emerald-50/30',
    dot: 'bg-emerald-500',
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

function onPlayerNameBlur(player) {
  updatePlayer(player.id, { name: player.name })
}

function toggleGender(player) {
  const gender = player.gender === 'female' ? 'male' : 'female'
  player.gender = gender
  updatePlayer(player.id, { gender })
}

function onPrizeBlur(prize, idx) {
  updatePrize(idx, prize.name)
}

const YELLOW_RANK_COLOR = { row: 'border-yellow-200 bg-yellow-50', badge: 'bg-yellow-400 text-white shadow', name: 'text-yellow-700', points: 'text-yellow-600' }
const DEFAULT_RANK_COLOR = { row: 'border-transparent hover:bg-slate-50', badge: 'bg-slate-100 text-slate-400', name: 'text-slate-700', points: 'text-indigo-600' }

function rankColor(idx) {
  return idx < 6 ? YELLOW_RANK_COLOR : DEFAULT_RANK_COLOR
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
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- 主要內容區 -->
    <div class="lg:col-span-2 space-y-6">

      <!-- 未分隊：顯示球員列表 -->
      <template v-if="!state.teamsAssigned">
        <div class="bg-white rounded-2xl shadow-sm border p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="font-bold text-lg flex items-center gap-2 text-indigo-600">
              <Users :size="20" /> 所有球員
            </h3>
            <button
              @click="generateTeams"
              class="bg-green-600 text-white px-6 py-2 rounded-xl hover:bg-green-700 transition flex items-center gap-2 font-bold shadow-md"
            >
              <Shuffle :size="18" /> 隨機分隊
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
            <div
              v-for="player in state.players"
              :key="player.id"
              class="flex items-center justify-between p-4 border rounded-2xl bg-slate-50 hover:bg-white transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center flex-shrink-0 border border-indigo-200">
                  <img v-if="player.photoUrl" :src="player.photoUrl" class="w-full h-full object-cover" :alt="player.name" />
                  <span v-else class="text-sm font-black text-indigo-500">{{ (player.name || '?')[0] }}</span>
                </div>
                <div>
                  <input
                    :value="player.name"
                    @input="player.name = $event.target.value"
                    @blur="onPlayerNameBlur(player)"
                    class="bg-transparent font-bold outline-none w-24 focus:text-indigo-600"
                  />
                  <button
                    @click="toggleGender(player)"
                    :class="[
                      'text-[10px] font-bold uppercase cursor-pointer hover:opacity-70 transition block',
                      player.gender === 'female' ? 'text-pink-500' : 'text-blue-500'
                    ]"
                  >
                    {{ player.gender === 'female' ? 'Female' : 'Male' }}
                  </button>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xl font-black text-slate-700 leading-none">{{ player.points }}</div>
                <div class="text-[10px] text-slate-400 font-bold uppercase">Points</div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 已分隊：顯示三隊與賽程 -->
      <template v-else>
        <!-- 三隊顯示 -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            v-for="key in TEAM_KEYS"
            :key="key"
            :class="['rounded-2xl border p-4', colorMap[TEAM_COLORS[key]].card]"
          >
            <div :class="['font-black text-sm mb-3 uppercase tracking-widest flex items-center gap-2', colorMap[TEAM_COLORS[key]].header]">
              <div :class="['w-2.5 h-2.5 rounded-full', colorMap[TEAM_COLORS[key]].dot]"></div>
              {{ TEAM_LABELS[key] }}
              <span :class="['ml-auto text-xs px-2 py-0.5 rounded-full font-bold', colorMap[TEAM_COLORS[key]].badge]">
                {{ teamPlayers[key].length }} 人
              </span>
            </div>
            <div class="space-y-1.5">
              <div
                v-for="player in teamPlayers[key]"
                :key="player.id"
                class="flex justify-between items-center px-3 py-2 bg-white/70 rounded-xl text-sm"
              >
                <div class="flex items-center gap-2">
                  <span
                    :class="['w-2 h-2 rounded-full', player.gender === 'female' ? 'bg-pink-400' : 'bg-blue-400']"
                  ></span>
                  <span class="font-bold">{{ player.name }}</span>
                </div>
                <span class="font-black text-slate-600">{{ player.points }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 賽程 -->
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
                <div v-if="!scheduleStarted" class="flex flex-col -my-1">
                  <button
                    @click="moveMatch(idx, -1)"
                    :disabled="idx === 0"
                    class="text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed transition"
                  ><ChevronUp :size="16" /></button>
                  <button
                    @click="moveMatch(idx, 1)"
                    :disabled="idx === state.matchSchedule.length - 1"
                    class="text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed transition"
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
    </div>

    <!-- 側邊欄 -->
    <div class="flex flex-col gap-4 h-fit sticky top-8">
      <button
        v-if="state.teamsAssigned && state.currentMatchIndex < 3"
        @click="setView('dashboard')"
        class="w-full bg-indigo-600 text-white py-4 rounded-2xl hover:bg-indigo-700 active:scale-95 transition flex items-center justify-center gap-3 font-black text-lg shadow-lg shadow-indigo-500/30 border-b-4 border-indigo-800"
      >
        <Monitor :size="24" /> 開始比賽
      </button>

      <div class="bg-white rounded-2xl shadow-sm border p-6">
      <h3 class="font-bold text-lg mb-4 flex items-center gap-2 text-rose-500">
        <Utensils :size="20" /> 目前排名
      </h3>
      <div class="space-y-1.5">
        <div
          v-for="(prize, idx) in state.prizes"
          :key="idx"
          :class="['flex items-center gap-3 p-3 rounded-xl transition border', rankColor(idx).row]"
        >
          <div
            :class="['w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0', rankColor(idx).badge]"
          >
            {{ idx + 1 }}
          </div>
          <img
            v-if="sortedPlayers[idx]?.photoUrl"
            :src="sortedPlayers[idx].photoUrl"
            class="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-slate-200"
          />
          <div v-else class="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <div :class="['font-bold text-sm truncate', rankColor(idx).name]">
              {{ sortedPlayers[idx]?.name ?? '—' }}
            </div>
            <input
              :value="prize.name"
              @input="prize.name = $event.target.value"
              @blur="onPrizeBlur(prize, idx)"
              class="text-xs outline-none bg-transparent text-slate-400 focus:text-indigo-600 w-full"
            />
          </div>
          <div v-if="sortedPlayers[idx]" class="text-right flex-shrink-0">
            <div :class="['text-base font-black', rankColor(idx).points]">
              {{ sortedPlayers[idx].points }}
            </div>
            <div class="text-[9px] text-slate-400 font-bold uppercase">pts</div>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>
