<script setup>
import { UserCircle } from '@lucide/vue'
import { useGame } from '../composables/useGame'

const { state, currentTeams, addScore } = useGame()
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <!-- 計分板 -->
    <div class="bg-slate-900 text-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
      <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-rose-500"></div>

      <div class="grid grid-cols-3 items-center">
        <!-- A 隊 -->
        <div class="text-center">
          <div class="text-indigo-400 font-black tracking-widest text-xs mb-4 uppercase">Team A Score</div>
          <div class="text-9xl font-black mb-8 leading-none">{{ state.score.teamA }}</div>
          <div class="flex flex-col gap-3 max-w-[200px] mx-auto">
            <button
              @click="addScore('teamA', 'male')"
              class="bg-slate-800 hover:bg-slate-700 py-3 rounded-2xl font-bold transition"
            >
              男生得分 +1
            </button>
            <button
              @click="addScore('teamA', 'female')"
              class="bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/20 transition active:scale-95 border-b-4 border-indigo-800"
            >
              女生得分 +2
            </button>
          </div>
        </div>

        <!-- VS 分隔 -->
        <div class="flex flex-col items-center gap-4 opacity-30">
          <div class="w-px h-32 bg-white"></div>
          <div class="text-white font-black text-2xl italic">VS</div>
          <div class="w-px h-32 bg-white"></div>
        </div>

        <!-- B 隊 -->
        <div class="text-center">
          <div class="text-rose-400 font-black tracking-widest text-xs mb-4 uppercase">Team B Score</div>
          <div class="text-9xl font-black mb-8 leading-none">{{ state.score.teamB }}</div>
          <div class="flex flex-col gap-3 max-w-[200px] mx-auto">
            <button
              @click="addScore('teamB', 'male')"
              class="bg-slate-800 hover:bg-slate-700 py-3 rounded-2xl font-bold transition"
            >
              男生得分 +1
            </button>
            <button
              @click="addScore('teamB', 'female')"
              class="bg-rose-600 hover:bg-rose-500 py-4 rounded-2xl font-black shadow-lg shadow-rose-500/20 transition active:scale-95 border-b-4 border-rose-800"
            >
              女生得分 +2
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 隊伍成員 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="tKey in ['teamA', 'teamB']"
        :key="tKey"
        class="bg-white p-6 rounded-3xl border border-slate-200"
      >
        <h4
          :class="[
            'font-black text-sm mb-4 uppercase tracking-widest flex items-center gap-2',
            tKey === 'teamA' ? 'text-indigo-600' : 'text-rose-600'
          ]"
        >
          <UserCircle :size="18" />
          {{ tKey === 'teamA' ? 'A 隊成員' : 'B 隊成員' }}
        </h4>
        <div class="grid grid-cols-1 gap-2">
          <div
            v-for="player in currentTeams[tKey]"
            :key="player.id"
            class="flex justify-between items-center p-3 bg-slate-50 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-slate-100"
          >
            <div class="flex items-center gap-3">
              <span
                :class="[
                  'w-2.5 h-2.5 rounded-full',
                  player.gender === 'female' ? 'bg-pink-400' : 'bg-blue-400'
                ]"
              ></span>
              <span class="font-bold">{{ player.name }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Acc. Points</span>
              <span class="font-black text-indigo-600 text-lg">{{ player.points }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
