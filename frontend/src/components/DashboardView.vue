<script setup>
import { computed, onMounted } from 'vue'
import { Award } from '@lucide/vue'
import { useGame } from '../composables/useGame'

const { state, currentMatch, addScore, fetchState, usePolling } = useGame()
onMounted(fetchState)
usePolling()

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
  return map[color]?.[type] ?? ''
}
</script>

<template>
  <div class="h-full flex flex-col">

    <!-- 有進行中比賽 -->
    <template v-if="currentMatch && matchPlayers">
      <div class="grid grid-cols-12 grid-rows-1 gap-4 flex-1 min-h-0">

        <!-- 左側：主隊全員 -->
        <div class="col-span-2 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div :class="['rounded-xl px-3 py-2 text-center font-black text-base uppercase tracking-widest flex-shrink-0', colorClass(currentMatch.homeColor, 'header')]" style="background: rgba(30,30,60,0.85)">
            {{ currentMatch.homeName }}
          </div>
          <div
            v-for="(player, i) in matchPlayers.home"
            :key="player.id"
            class="bg-slate-800 rounded-2xl border border-slate-700 flex-1 min-h-0 flex flex-col items-center gap-1 py-2 px-2 overflow-hidden"
            :class="i === 0 ? 'border-yellow-500/40' : ''"
          >
            <div class="w-full rounded-xl overflow-hidden bg-slate-700 flex items-center justify-center flex-1 min-h-0">
              <img v-if="player.photoUrl" :src="player.photoUrl" class="w-full h-full object-cover" :alt="player.name" />
              <span v-else class="font-black text-white text-4xl">{{ (player.name || '?')[0] }}</span>
            </div>
            <div class="font-black text-white text-sm text-center leading-none w-full truncate">{{ player.name }}</div>
            <div :class="['font-black text-2xl leading-none', colorClass(currentMatch.homeColor, 'playerPts')]">{{ player.points }}</div>
          </div>
        </div>

        <!-- 中央：計分板（含內嵌按鈕） -->
        <div class="col-span-8 min-h-0">
          <div class="bg-slate-900 rounded-[32px] text-white shadow-2xl relative overflow-hidden flex flex-col" style="height:100%">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500"></div>

            <div class="text-center text-slate-500 font-black tracking-[0.25em] text-sm pt-6 uppercase">
              場次 {{ state.currentMatchIndex + 1 }} / 3
            </div>

            <!-- 分數區 + 按鈕 -->
            <div class="flex items-stretch flex-1 px-4 pb-8 gap-2">

              <!-- 主隊 -->
              <div class="flex-1 flex flex-col items-center justify-between">
                <div :class="['font-black tracking-widest text-xl mb-2 uppercase', colorClass(currentMatch.homeColor, 'text')]">
                  {{ currentMatch.homeName }}
                </div>
                <div class="font-black leading-none flex-1 flex items-center" style="font-size: clamp(100px, 14vw, 200px)">
                  {{ currentMatch.scoreHome }}
                </div>
                <!-- 按鈕列 -->
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

              <!-- 中間 VS + 資訊 -->
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
                <!-- 按鈕列 -->
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

            <div class="pb-5 text-slate-600 text-sm font-bold tracking-widest text-center">
              目標 {{ state.maxScore }} 分 · 上限 {{ state.deuceLimit }} 分
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
            class="bg-slate-800 rounded-2xl border border-slate-700 flex-1 min-h-0 flex flex-col items-center gap-1 py-2 px-2 overflow-hidden"
            :class="i === 0 ? 'border-yellow-500/40' : ''"
          >
            <div class="w-full rounded-xl overflow-hidden bg-slate-700 flex items-center justify-center flex-1 min-h-0">
              <img v-if="player.photoUrl" :src="player.photoUrl" class="w-full h-full object-cover" :alt="player.name" />
              <span v-else class="font-black text-white text-4xl">{{ (player.name || '?')[0] }}</span>
            </div>
            <div class="font-black text-white text-sm text-center leading-none w-full truncate">{{ player.name }}</div>
            <div :class="['font-black text-2xl leading-none', colorClass(currentMatch.awayColor, 'playerPts')]">{{ player.points }}</div>
          </div>
        </div>

      </div>
    </template>

    <!-- 無進行中比賽 -->
    <template v-else>
      <div class="flex flex-col items-center justify-center h-[calc(100vh-180px)] text-center">
        <div class="bg-slate-900 rounded-[40px] p-16 text-white shadow-2xl max-w-md">
          <Award :size="48" class="mx-auto mb-6 text-slate-600" />
          <div class="text-slate-300 font-black text-2xl mb-2">目前無進行中比賽</div>
          <div class="text-slate-500 text-sm">請至賽程管理頁面進行隨機分隊</div>
        </div>
      </div>
    </template>

  </div>
</template>
