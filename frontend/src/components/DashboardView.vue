<script setup>
import { computed, onMounted } from 'vue'
import { Award } from '@lucide/vue'
import { useGame } from '../composables/useGame'

const { state, currentMatch, addScore, endMatch, fetchState, usePolling } = useGame()
onMounted(fetchState)
usePolling()

function confirmEndMatch() {
  if (confirm('確定要結束本場比賽嗎？')) endMatch()
}

const matchPlayers = computed(() => {
  if (!currentMatch.value) return null
  const rank = (players) =>
    [...players].sort((a, b) => b.points - a.points || a.id - b.id)
  return {
    home: rank(currentMatch.value.homePlayers),
    away: rank(currentMatch.value.awayPlayers),
  }
})

const colorClass = (color, type) => {
  const map = {
    indigo: { text: 'text-indigo-400', score: 'text-indigo-400', btn: 'bg-indigo-500 hover:bg-indigo-400', btnF: 'bg-indigo-600 hover:bg-indigo-500 border-indigo-800 shadow-indigo-500/30', header: 'bg-indigo-900/50 text-indigo-300', playerPts: 'text-indigo-400' },
    rose:   { text: 'text-rose-400',   score: 'text-rose-400',   btn: 'bg-rose-500 hover:bg-rose-400',     btnF: 'bg-rose-600 hover:bg-rose-500 border-rose-800 shadow-rose-500/30',     header: 'bg-rose-900/50 text-rose-300',   playerPts: 'text-rose-400'   },
    emerald:{ text: 'text-emerald-400',score: 'text-emerald-400',btn: 'bg-emerald-500 hover:bg-emerald-400',btnF: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-800 shadow-emerald-500/30',header:'bg-emerald-900/50 text-emerald-300',playerPts:'text-emerald-400'},
  }
  map.indigo.floatPts = 'text-indigo-300'
  map.rose.floatPts = 'text-rose-300'
  map.emerald.floatPts = 'text-emerald-300'
  return map[color]?.[type] ?? ''
}
</script>

<template>
  <div class="h-full flex flex-col">

    <!-- 有進行中比賽 -->
    <template v-if="currentMatch && matchPlayers">

      <!-- ===== Mobile layout (< lg) ===== -->
      <div class="flex flex-col gap-2 flex-1 min-h-0 lg:hidden">

        <!-- 上方：兩隊球員橫向滾動 -->
        <div class="flex gap-2 flex-shrink-0">
          <!-- 主隊 -->
          <div class="flex-1 min-w-0">
            <div
              :class="['rounded-xl px-2 py-1.5 text-center font-black text-xs uppercase tracking-wider mb-1.5', colorClass(currentMatch.homeColor, 'header')]"
              style="background: rgba(30,30,60,0.9)"
            >
              {{ currentMatch.homeName }}
            </div>
            <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <div
                v-for="player in matchPlayers.home"
                :key="player.id"
                class="flex-shrink-0 flex flex-col items-center gap-0.5 w-[52px]"
              >
                <div class="w-11 h-11 rounded-xl overflow-hidden bg-slate-700 flex items-center justify-center">
                  <img v-if="player.photoUrl" :src="player.photoUrl" class="w-full h-full object-cover" :alt="player.name" />
                  <span v-else class="font-black text-white text-lg">{{ (player.name || '?')[0] }}</span>
                </div>
                <div class="font-bold text-white text-[10px] truncate w-full text-center leading-tight">{{ player.name }}</div>
                <div :class="['font-black text-sm leading-none', colorClass(currentMatch.homeColor, 'playerPts')]">{{ player.points }}</div>
              </div>
            </div>
          </div>

          <!-- 客隊 -->
          <div class="flex-1 min-w-0">
            <div
              :class="['rounded-xl px-2 py-1.5 text-center font-black text-xs uppercase tracking-wider mb-1.5', colorClass(currentMatch.awayColor, 'header')]"
              style="background: rgba(30,30,60,0.9)"
            >
              {{ currentMatch.awayName }}
            </div>
            <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none justify-end">
              <div
                v-for="player in matchPlayers.away"
                :key="player.id"
                class="flex-shrink-0 flex flex-col items-center gap-0.5 w-[52px]"
              >
                <div class="w-11 h-11 rounded-xl overflow-hidden bg-slate-700 flex items-center justify-center">
                  <img v-if="player.photoUrl" :src="player.photoUrl" class="w-full h-full object-cover" :alt="player.name" />
                  <span v-else class="font-black text-white text-lg">{{ (player.name || '?')[0] }}</span>
                </div>
                <div class="font-bold text-white text-[10px] truncate w-full text-center leading-tight">{{ player.name }}</div>
                <div :class="['font-black text-sm leading-none', colorClass(currentMatch.awayColor, 'playerPts')]">{{ player.points }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 計分板 -->
        <div class="bg-slate-900 rounded-3xl text-white shadow-2xl flex-1 min-h-0 flex flex-col overflow-hidden relative">
          <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 rounded-t-3xl"></div>

          <div class="text-center text-slate-500 font-black tracking-[0.2em] text-xs pt-4">
            場次 {{ state.currentMatchIndex + 1 }} / 3
          </div>

          <div class="flex items-center justify-around flex-1 px-4">
            <div :class="['font-black leading-none', colorClass(currentMatch.homeColor, 'score')]" style="font-size: clamp(72px, 22vw, 150px)">
              {{ currentMatch.scoreHome }}
            </div>
            <div class="opacity-25 font-black text-white text-2xl italic">VS</div>
            <div :class="['font-black leading-none', colorClass(currentMatch.awayColor, 'score')]" style="font-size: clamp(72px, 22vw, 150px)">
              {{ currentMatch.scoreAway }}
            </div>
          </div>

          <div class="text-slate-600 text-xs font-bold tracking-widest text-center">
            目標 {{ state.maxScore }} 分 · 上限 {{ state.deuceLimit }} 分
          </div>

          <div class="flex justify-center pb-4 pt-2">
            <button
              @click="confirmEndMatch"
              class="px-6 h-9 rounded-full font-black text-xs tracking-widest bg-slate-700/80 hover:bg-slate-600 text-slate-300 border border-slate-600 transition active:scale-95"
            >結束比賽</button>
          </div>
        </div>

        <!-- 計分按鈕 -->
        <div class="flex gap-3 flex-shrink-0 pb-1">
          <!-- 主隊按鈕 -->
          <div class="flex-1 flex items-center gap-1.5">
            <button v-for="d in [-2, -1]" :key="d" @click="addScore('home', d)"
              class="flex-1 h-14 rounded-2xl font-black text-base transition active:scale-90 bg-slate-700/80 text-slate-400 border border-slate-600"
            >{{ d }}</button>
            <div class="w-px h-8 bg-slate-700 flex-shrink-0"></div>
            <button v-for="d in [1, 2]" :key="d" @click="addScore('home', d)"
              :class="['h-14 rounded-2xl font-black text-base transition active:scale-90 text-white border-b-2', colorClass(currentMatch.homeColor, 'btn'), d === 2 ? 'flex-[1.3] text-lg' : 'flex-1']"
            >+{{ d }}</button>
          </div>

          <!-- 客隊按鈕 -->
          <div class="flex-1 flex items-center gap-1.5">
            <button v-for="d in [-2, -1]" :key="d" @click="addScore('away', d)"
              class="flex-1 h-14 rounded-2xl font-black text-base transition active:scale-90 bg-slate-700/80 text-slate-400 border border-slate-600"
            >{{ d }}</button>
            <div class="w-px h-8 bg-slate-700 flex-shrink-0"></div>
            <button v-for="d in [1, 2]" :key="d" @click="addScore('away', d)"
              :class="['h-14 rounded-2xl font-black text-base transition active:scale-90 text-white border-b-2', colorClass(currentMatch.awayColor, 'btn'), d === 2 ? 'flex-[1.3] text-lg' : 'flex-1']"
            >+{{ d }}</button>
          </div>
        </div>

      </div>

      <!-- ===== Desktop layout (>= lg) ===== -->
      <div class="hidden lg:grid lg:grid-cols-12 gap-4 flex-1 min-h-0">

        <!-- 左側：主隊全員 -->
        <div class="col-span-2 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div :class="['rounded-xl px-3 py-2 text-center font-black text-base uppercase tracking-widest flex-shrink-0', colorClass(currentMatch.homeColor, 'header')]" style="background: rgba(30,30,60,0.85)">
            {{ currentMatch.homeName }}
          </div>
          <div
            v-for="(player, i) in matchPlayers.home"
            :key="player.id"
            class="relative bg-slate-700 rounded-2xl border border-slate-700 flex-1 min-h-0 overflow-hidden"
            :class="i === 0 ? 'border-yellow-500/40' : ''"
          >
            <div class="absolute inset-0 flex items-center justify-center">
              <img v-if="player.photoUrl" :src="player.photoUrl" class="w-full h-full object-cover" :alt="player.name" />
              <span v-else class="font-black text-white text-4xl">{{ (player.name || '?')[0] }}</span>
            </div>
            <div class="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-end justify-between gap-1 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
              <div class="font-black text-white text-sm leading-none truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{{ player.name }}</div>
              <div :class="['font-black text-xl leading-none flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]', colorClass(currentMatch.homeColor, 'floatPts')]">{{ player.points }}</div>
            </div>
          </div>
        </div>

        <!-- 中央：計分板 -->
        <div class="col-span-8 min-h-0">
          <div class="bg-slate-900 rounded-[32px] text-white shadow-2xl relative overflow-hidden flex flex-col" style="height:100%">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500"></div>

            <div class="text-center text-slate-500 font-black tracking-[0.25em] text-sm pt-6 uppercase">
              場次 {{ state.currentMatchIndex + 1 }} / 3
            </div>

            <div class="flex items-stretch flex-1 px-4 pb-8 gap-2">

              <!-- 主隊 -->
              <div class="flex-1 flex flex-col items-center justify-between">
                <div :class="['font-black tracking-widest text-xl mb-2 uppercase', colorClass(currentMatch.homeColor, 'text')]">
                  {{ currentMatch.homeName }}
                </div>
                <div class="font-black leading-none flex-1 flex items-center" style="font-size: clamp(100px, 14vw, 200px)">
                  {{ currentMatch.scoreHome }}
                </div>
                <div class="flex items-center gap-2 mt-4">
                  <button v-for="d in [-2, -1]" :key="d" @click="addScore('home', d)"
                    class="w-12 h-12 rounded-2xl font-black text-base transition active:scale-90 bg-slate-700/80 hover:bg-slate-600 text-slate-400 border border-slate-600"
                  >{{ d }}</button>
                  <div class="w-px h-8 bg-slate-700 mx-1"></div>
                  <button v-for="d in [1, 2]" :key="d" @click="addScore('home', d)"
                    :class="['w-12 h-12 rounded-2xl font-black text-base transition active:scale-90 text-white border-b-2', colorClass(currentMatch.homeColor, 'btn'),
                      d === 2 ? 'w-14 h-14 text-lg' : '']"
                  >+{{ d }}</button>
                </div>
              </div>

              <!-- 中間 VS -->
              <div class="flex flex-col items-center justify-center gap-3 px-2 opacity-25 w-16 flex-shrink-0">
                <div class="w-px flex-1 bg-white"></div>
                <div class="text-white font-black text-lg italic">VS</div>
                <div class="w-px flex-1 bg-white"></div>
              </div>

              <!-- 客隊 -->
              <div class="flex-1 flex flex-col items-center justify-between">
                <div :class="['font-black tracking-widest text-xl mb-2 uppercase', colorClass(currentMatch.awayColor, 'text')]">
                  {{ currentMatch.awayName }}
                </div>
                <div class="font-black leading-none flex-1 flex items-center" style="font-size: clamp(100px, 14vw, 200px)">
                  {{ currentMatch.scoreAway }}
                </div>
                <div class="flex items-center gap-2 mt-4">
                  <button v-for="d in [-2, -1]" :key="d" @click="addScore('away', d)"
                    class="w-12 h-12 rounded-2xl font-black text-base transition active:scale-90 bg-slate-700/80 hover:bg-slate-600 text-slate-400 border border-slate-600"
                  >{{ d }}</button>
                  <div class="w-px h-8 bg-slate-700 mx-1"></div>
                  <button v-for="d in [1, 2]" :key="d" @click="addScore('away', d)"
                    :class="['w-12 h-12 rounded-2xl font-black text-base transition active:scale-90 text-white border-b-2', colorClass(currentMatch.awayColor, 'btn'),
                      d === 2 ? 'w-14 h-14 text-lg' : '']"
                  >+{{ d }}</button>
                </div>
              </div>

            </div>

            <div class="text-slate-600 text-sm font-bold tracking-widest text-center">
              目標 {{ state.maxScore }} 分 · 上限 {{ state.deuceLimit }} 分
            </div>

            <div class="flex justify-center pb-5 pt-3">
              <button
                @click="confirmEndMatch"
                class="px-8 h-10 rounded-full font-black text-sm tracking-widest bg-slate-700/80 hover:bg-slate-600 text-slate-300 border border-slate-600 transition active:scale-95"
              >結束比賽</button>
            </div>

          </div>
        </div>

        <!-- 右側：客隊全員 -->
        <div class="col-span-2 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div :class="['rounded-xl px-3 py-2 text-center font-black text-base uppercase tracking-widest flex-shrink-0', colorClass(currentMatch.awayColor, 'header')]" style="background: rgba(30,30,60,0.85)">
            {{ currentMatch.awayName }}
          </div>
          <div
            v-for="(player, i) in matchPlayers.away"
            :key="player.id"
            class="relative bg-slate-700 rounded-2xl border border-slate-700 flex-1 min-h-0 overflow-hidden"
            :class="i === 0 ? 'border-yellow-500/40' : ''"
          >
            <div class="absolute inset-0 flex items-center justify-center">
              <img v-if="player.photoUrl" :src="player.photoUrl" class="w-full h-full object-cover" :alt="player.name" />
              <span v-else class="font-black text-white text-4xl">{{ (player.name || '?')[0] }}</span>
            </div>
            <div class="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-end justify-between gap-1 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
              <div class="font-black text-white text-sm leading-none truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{{ player.name }}</div>
              <div :class="['font-black text-xl leading-none flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]', colorClass(currentMatch.awayColor, 'floatPts')]">{{ player.points }}</div>
            </div>
          </div>
        </div>

      </div>
    </template>

    <!-- 無進行中比賽 -->
    <template v-else>
      <div class="flex flex-col items-center justify-center h-[calc(100vh-180px)] text-center">
        <div class="bg-slate-900 rounded-[40px] p-10 md:p-16 text-white shadow-2xl max-w-md mx-4">
          <Award :size="48" class="mx-auto mb-6 text-slate-600" />
          <div class="text-slate-300 font-black text-xl md:text-2xl mb-2">目前無進行中比賽</div>
          <div class="text-slate-500 text-sm">請至賽程管理頁面進行隨機分隊</div>
        </div>
      </div>
    </template>

  </div>
</template>
