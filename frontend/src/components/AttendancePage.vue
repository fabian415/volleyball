<script setup>
import { ref, computed, onMounted } from 'vue'
import { UserCheck, Users, ArrowRight, ArrowLeft, ListOrdered } from '@lucide/vue'
import { useGame } from '../composables/useGame'
import { useNav } from '../composables/useNav'

const { state, fetchState, markAttending, markAbsent, setView } = useGame()
const { currentPage } = useNav()

const roster = ref([])
const loading = ref(true)

async function fetchRoster() {
  loading.value = true
  const res = await fetch('/api/roster')
  roster.value = await res.json()
  loading.value = false
}

onMounted(async () => {
  await fetchState()
  await fetchRoster()
})

const attendingIds = computed(() => state.value.attendingIds || [])

const notAttending = computed(() => roster.value.filter(p => !attendingIds.value.includes(p.id)))
const attending = computed(() => roster.value.filter(p => attendingIds.value.includes(p.id)))

const notAttendingFemale = computed(() => notAttending.value.filter(p => p.gender === 'female'))
const notAttendingMale = computed(() => notAttending.value.filter(p => p.gender !== 'female'))
const attendingFemale = computed(() => attending.value.filter(p => p.gender === 'female'))
const attendingMale = computed(() => attending.value.filter(p => p.gender !== 'female'))

function toggleAttend(player) {
  markAttending(player.id)
}

function toggleAbsent(player) {
  markAbsent(player.id)
}

async function finishAndGoToManagement() {
  currentPage.value = 'game'
  await setView('management')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold flex items-center gap-2 text-indigo-600">
          <UserCheck :size="22" /> 出席登記
        </h2>
        <p class="text-sm text-slate-400 mt-1">點選左側選手將其加入今日出席名單，完成後回到賽程管理即可開始分隊</p>
      </div>
      <button
        @click="finishAndGoToManagement"
        class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 font-bold text-sm shadow-md flex-shrink-0"
      >
        <ListOrdered :size="16" /> 完成，前往賽程管理
      </button>
    </div>

    <div v-if="loading" class="text-center text-slate-400 py-20">載入中...</div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 未出席 -->
      <div class="bg-white rounded-2xl shadow-sm border p-6">
        <h3 class="font-bold text-base mb-4 flex items-center gap-2 text-slate-500">
          <Users :size="18" /> 未出席
          <span class="text-sm font-normal text-slate-400">{{ notAttending.length }} 人</span>
        </h3>

        <div v-if="notAttending.length === 0" class="text-center text-slate-300 py-10 text-sm">
          全部人員皆已加入出席名單
        </div>

        <template v-else>
          <div v-if="notAttendingFemale.length" class="mb-4">
            <p class="text-[11px] font-bold uppercase tracking-wide text-pink-500 mb-2">
              女生 {{ notAttendingFemale.length }} 人
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="p in notAttendingFemale"
                :key="p.id"
                @click="toggleAttend(p)"
                class="group flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border border-pink-200 bg-pink-50 hover:bg-pink-100 active:scale-95 transition text-sm font-bold text-pink-700"
              >
                <span class="w-6 h-6 rounded-full overflow-hidden bg-pink-100 flex items-center justify-center flex-shrink-0 border border-pink-200">
                  <img v-if="p.photoUrl" :src="p.photoUrl" class="w-full h-full object-cover" :alt="p.name" />
                  <span v-else class="text-[10px] font-black">{{ (p.name || '?')[0] }}</span>
                </span>
                {{ p.name }}
                <ArrowRight :size="13" class="opacity-0 group-hover:opacity-100 transition" />
              </button>
            </div>
          </div>

          <div v-if="notAttendingMale.length">
            <p class="text-[11px] font-bold uppercase tracking-wide text-blue-500 mb-2">
              男生 {{ notAttendingMale.length }} 人
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="p in notAttendingMale"
                :key="p.id"
                @click="toggleAttend(p)"
                class="group flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 active:scale-95 transition text-sm font-bold text-blue-700"
              >
                <span class="w-6 h-6 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center flex-shrink-0 border border-blue-200">
                  <img v-if="p.photoUrl" :src="p.photoUrl" class="w-full h-full object-cover" :alt="p.name" />
                  <span v-else class="text-[10px] font-black">{{ (p.name || '?')[0] }}</span>
                </span>
                {{ p.name }}
                <ArrowRight :size="13" class="opacity-0 group-hover:opacity-100 transition" />
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- 出席 -->
      <div class="bg-white rounded-2xl shadow-sm border border-green-200 p-6">
        <h3 class="font-bold text-base mb-4 flex items-center gap-2 text-green-600">
          <UserCheck :size="18" /> 出席（將加入分隊名單）
          <span class="text-sm font-normal text-slate-400">{{ attending.length }} 人</span>
        </h3>

        <div v-if="attending.length === 0" class="text-center text-slate-300 py-10 text-sm">
          尚無人員加入，請從左側點選出席人員
        </div>

        <template v-else>
          <div v-if="attendingFemale.length" class="mb-4">
            <p class="text-[11px] font-bold uppercase tracking-wide text-pink-500 mb-2">
              女生 {{ attendingFemale.length }} 人
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="p in attendingFemale"
                :key="p.id"
                @click="toggleAbsent(p)"
                class="group flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border border-pink-300 bg-pink-500 hover:bg-pink-600 active:scale-95 transition text-sm font-bold text-white"
              >
                <ArrowLeft :size="13" class="opacity-0 group-hover:opacity-100 transition" />
                <span class="w-6 h-6 rounded-full overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
                  <img v-if="p.photoUrl" :src="p.photoUrl" class="w-full h-full object-cover" :alt="p.name" />
                  <span v-else class="text-[10px] font-black">{{ (p.name || '?')[0] }}</span>
                </span>
                {{ p.name }}
              </button>
            </div>
          </div>

          <div v-if="attendingMale.length">
            <p class="text-[11px] font-bold uppercase tracking-wide text-blue-500 mb-2">
              男生 {{ attendingMale.length }} 人
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="p in attendingMale"
                :key="p.id"
                @click="toggleAbsent(p)"
                class="group flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border border-blue-300 bg-blue-500 hover:bg-blue-600 active:scale-95 transition text-sm font-bold text-white"
              >
                <ArrowLeft :size="13" class="opacity-0 group-hover:opacity-100 transition" />
                <span class="w-6 h-6 rounded-full overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
                  <img v-if="p.photoUrl" :src="p.photoUrl" class="w-full h-full object-cover" :alt="p.name" />
                  <span v-else class="text-[10px] font-black">{{ (p.name || '?')[0] }}</span>
                </span>
                {{ p.name }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
