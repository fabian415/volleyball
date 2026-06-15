<script setup>
import { ref, onMounted } from 'vue'
import { Trophy, Users, Gift, ListOrdered, Monitor, Menu, X, Settings } from '@lucide/vue'
import { useGame } from './composables/useGame'
import SetupView from './components/SetupView.vue'
import ManagementView from './components/ManagementView.vue'
import DashboardView from './components/DashboardView.vue'
import PlayersPage from './components/PlayersPage.vue'
import PrizesPage from './components/PrizesPage.vue'
import SettingsPage from './components/SettingsPage.vue'

const { state, fetchState, setView } = useGame()

const currentPage = ref('game')
const menuOpen = ref(false)

onMounted(fetchState)

function navigate(page) {
  menuOpen.value = false
  if (page === 'game-management') {
    currentPage.value = 'game'
    setView('management')
  } else if (page === 'game-dashboard') {
    currentPage.value = 'game'
    setView('dashboard')
  } else {
    currentPage.value = page
  }
}

function isActive(page) {
  if (page === 'game-management') return currentPage.value === 'game' && state.value.currentView === 'management'
  if (page === 'game-dashboard') return currentPage.value === 'game' && state.value.currentView === 'dashboard'
  return currentPage.value === page
}

const navItems = [
  { key: 'game-management', label: '賽程管理', icon: ListOrdered },
  { key: 'game-dashboard', label: '大螢幕看板', icon: Monitor, requireSetup: true },
  { key: 'players', label: '選手管理', icon: Users },
  { key: 'prizes', label: '獎項管理', icon: Gift },
  { key: 'settings', label: '系統設置', icon: Settings },
]
</script>

<template>
  <div class="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
    <header class="flex-shrink-0 max-w-7xl w-full mx-auto flex justify-between items-center px-4 md:px-8 pt-4 md:pt-6 pb-4 relative">
      <div class="flex items-center gap-3">
        <div class="bg-indigo-600 p-2 rounded-lg text-white shadow-lg">
          <Trophy :size="28" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight">研華內部對抗賽</h1>
      </div>

      <div class="relative">
        <button
          @click="menuOpen = !menuOpen"
          class="p-2 rounded-xl bg-white border shadow-sm hover:bg-slate-50 transition text-slate-600"
        >
          <X v-if="menuOpen" :size="22" />
          <Menu v-else :size="22" />
        </button>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95 -translate-y-1"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 -translate-y-1"
        >
          <div
            v-if="menuOpen"
            class="absolute right-0 mt-2 w-48 bg-white border rounded-xl shadow-xl z-50 p-1 origin-top-right"
          >
            <template v-for="item in navItems" :key="item.key">
              <button
                v-if="!item.requireSetup || state.setupComplete"
                @click="navigate(item.key)"
                :class="[
                  'w-full px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2.5 text-left',
                  isActive(item.key)
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-slate-50 text-slate-600'
                ]"
              >
                <component :is="item.icon" :size="16" />
                {{ item.label }}
              </button>
            </template>
          </div>
        </Transition>
      </div>

      <!-- 點選選單外部關閉 -->
      <div
        v-if="menuOpen"
        class="fixed inset-0 z-40"
        @click="menuOpen = false"
      />
    </header>

    <main
      class="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 md:px-8 pb-4 md:pb-6"
      :class="(currentPage === 'game' && state.setupComplete && state.currentView === 'dashboard') ? 'overflow-hidden' : 'overflow-auto'"
    >
      <PlayersPage v-if="currentPage === 'players'" />
      <PrizesPage v-if="currentPage === 'prizes'" />
      <SettingsPage v-if="currentPage === 'settings'" />
      <template v-if="currentPage === 'game'">
        <SetupView v-if="!state.setupComplete" />
        <ManagementView v-else-if="state.currentView === 'management'" />
        <DashboardView v-else-if="state.currentView === 'dashboard'" />
      </template>
    </main>
  </div>
</template>
