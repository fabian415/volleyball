<script setup>
import { ref, onMounted } from 'vue'
import { Users, Plus, Trash2, Edit2, Check, X, Camera } from '@lucide/vue'

const roster = ref([])
const editingId = ref(null)
const editName = ref('')
const editGender = ref('')
const showAddForm = ref(false)
const newName = ref('')
const newGender = ref('male')
const addInput = ref(null)

async function fetchRoster() {
  const res = await fetch('/api/roster')
  roster.value = await res.json()
}

async function addPlayer() {
  if (!newName.value.trim()) return
  await fetch('/api/roster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName.value.trim(), gender: newGender.value })
  })
  newName.value = ''
  newGender.value = 'male'
  showAddForm.value = false
  await fetchRoster()
}

function startEdit(player) {
  editingId.value = player.id
  editName.value = player.name
  editGender.value = player.gender
}

async function saveEdit(id) {
  if (!editName.value.trim()) return
  await fetch(`/api/roster/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: editName.value.trim(), gender: editGender.value })
  })
  editingId.value = null
  await fetchRoster()
}

function cancelEdit() {
  editingId.value = null
}

async function deletePlayer(id, name) {
  if (!confirm(`確定要刪除「${name}」？`)) return
  await fetch(`/api/roster/${id}`, { method: 'DELETE' })
  await fetchRoster()
}

async function uploadPhoto(id, event) {
  const file = event.target.files[0]
  if (!file) return
  const fd = new FormData()
  fd.append('photo', file)
  await fetch(`/api/roster/${id}/photo`, { method: 'POST', body: fd })
  event.target.value = ''
  await fetchRoster()
}

function openAdd() {
  showAddForm.value = true
  editingId.value = null
  setTimeout(() => addInput.value?.focus(), 50)
}

onMounted(fetchRoster)
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold flex items-center gap-2 text-indigo-600">
        <Users :size="22" />
        選手名單
        <span class="text-sm font-normal text-slate-400">{{ roster.length }} 人</span>
      </h2>
      <button
        @click="openAdd"
        class="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-bold shadow-sm"
      >
        <Plus :size="16" /> 新增選手
      </button>
    </div>

    <!-- Add form -->
    <div v-if="showAddForm" class="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
      <p class="text-xs font-bold text-indigo-600 mb-3 uppercase">新增選手</p>
      <div class="flex flex-wrap gap-3 items-end">
        <div class="flex-1 min-w-[160px]">
          <label class="block text-xs font-bold text-slate-600 mb-1">姓名</label>
          <input
            ref="addInput"
            v-model="newName"
            @keyup.enter="addPlayer"
            placeholder="輸入選手姓名"
            class="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">性別</label>
          <select v-model="newGender" class="p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </div>
        <button @click="addPlayer" class="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 font-bold text-sm">新增</button>
        <button @click="showAddForm = false" class="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-200 font-bold text-sm">取消</button>
      </div>
    </div>

    <!-- Player grid -->
    <div v-if="roster.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="player in roster"
        :key="player.id"
        class="flex items-center gap-3 p-3 border rounded-xl hover:shadow-sm transition group"
        :class="editingId === player.id ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'"
      >
        <!-- Avatar + upload -->
        <div class="relative flex-shrink-0">
          <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
            <img
              v-if="player.photoUrl"
              :src="player.photoUrl"
              class="w-full h-full object-cover"
              :alt="player.name"
            />
            <span v-else class="text-lg font-black text-slate-400">{{ (player.name || '?')[0] }}</span>
          </div>
          <label class="absolute -bottom-0.5 -right-0.5 bg-white border border-slate-200 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer hover:bg-slate-50 shadow-sm opacity-0 group-hover:opacity-100 transition">
            <Camera :size="10" class="text-slate-500" />
            <input type="file" accept="image/*" class="hidden" @change="uploadPhoto(player.id, $event)" />
          </label>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <template v-if="editingId !== player.id">
            <div class="font-bold text-sm truncate">{{ player.name }}</div>
            <div :class="['text-[10px] font-bold uppercase tracking-wide', player.gender === 'female' ? 'text-pink-500' : 'text-blue-500']">
              {{ player.gender === 'female' ? 'Female' : 'Male' }}
            </div>
          </template>
          <template v-else>
            <input
              v-model="editName"
              @keyup.enter="saveEdit(player.id)"
              @keyup.esc="cancelEdit"
              class="w-full text-sm font-bold border-b border-indigo-400 outline-none bg-transparent mb-1 focus:border-indigo-600"
              autofocus
            />
            <select v-model="editGender" class="text-xs border rounded px-1 py-0.5 bg-white outline-none">
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </template>
        </div>

        <!-- Actions -->
        <div class="flex gap-1 flex-shrink-0">
          <template v-if="editingId !== player.id">
            <button
              @click="startEdit(player)"
              class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition opacity-0 group-hover:opacity-100"
            >
              <Edit2 :size="14" />
            </button>
            <button
              @click="deletePlayer(player.id, player.name)"
              class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
            >
              <Trash2 :size="14" />
            </button>
          </template>
          <template v-else>
            <button @click="saveEdit(player.id)" class="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition">
              <Check :size="14" />
            </button>
            <button @click="cancelEdit" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition">
              <X :size="14" />
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-16 text-slate-400">
      <Users :size="40" class="mx-auto mb-3 opacity-30" />
      <p class="font-bold">尚無選手</p>
      <p class="text-sm">點擊「新增選手」開始新增</p>
    </div>
  </div>
</template>
