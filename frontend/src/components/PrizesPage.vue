<script setup>
import { ref, onMounted } from 'vue'
import { Gift, Plus, Trash2, Edit2, Check, X, GripVertical } from '@lucide/vue'

const prizes = ref([])
const editingId = ref(null)
const editName = ref('')
const showAddForm = ref(false)
const newName = ref('')
const addInput = ref(null)

async function fetchPrizes() {
  const res = await fetch('/api/prizes-config')
  prizes.value = await res.json()
}

async function addPrize() {
  if (!newName.value.trim()) return
  await fetch('/api/prizes-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName.value.trim() })
  })
  newName.value = ''
  showAddForm.value = false
  await fetchPrizes()
}

function startEdit(prize) {
  editingId.value = prize.id
  editName.value = prize.name
}

async function savePrize(id) {
  if (!editName.value.trim()) return
  await fetch(`/api/prizes-config/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: editName.value.trim() })
  })
  editingId.value = null
  await fetchPrizes()
}

function cancelEdit() {
  editingId.value = null
}

async function deletePrize(id, name) {
  if (!confirm(`確定要刪除「${name}」？`)) return
  await fetch(`/api/prizes-config/${id}`, { method: 'DELETE' })
  await fetchPrizes()
}

function openAdd() {
  showAddForm.value = true
  editingId.value = null
  setTimeout(() => addInput.value?.focus(), 50)
}

const rankLabel = (idx) =>
  idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`

onMounted(fetchPrizes)
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border p-6 max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold flex items-center gap-2 text-rose-500">
        <Gift :size="22" />
        獎項設定
        <span class="text-sm font-normal text-slate-400">{{ prizes.length }} 項</span>
      </h2>
      <button
        @click="openAdd"
        class="bg-rose-500 text-white px-4 py-2 rounded-xl hover:bg-rose-600 transition flex items-center gap-2 text-sm font-bold shadow-sm"
      >
        <Plus :size="16" /> 新增獎項
      </button>
    </div>

    <!-- Add form -->
    <div v-if="showAddForm" class="mb-6 p-4 bg-rose-50 rounded-xl border border-rose-200">
      <p class="text-xs font-bold text-rose-600 mb-3 uppercase">新增獎項</p>
      <div class="flex gap-3 items-end">
        <div class="flex-1">
          <label class="block text-xs font-bold text-slate-600 mb-1">獎項名稱</label>
          <input
            ref="addInput"
            v-model="newName"
            @keyup.enter="addPrize"
            placeholder="例如：豪華龍蝦大餐"
            class="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-rose-400 text-sm"
          />
        </div>
        <button @click="addPrize" class="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 font-bold text-sm">新增</button>
        <button @click="showAddForm = false" class="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-200 font-bold text-sm">取消</button>
      </div>
    </div>

    <!-- Prizes list -->
    <div v-if="prizes.length > 0" class="space-y-2">
      <div
        v-for="(prize, idx) in prizes"
        :key="prize.id"
        class="flex items-center gap-3 p-3 rounded-xl border transition group"
        :class="[
          editingId === prize.id ? 'border-rose-300 bg-rose-50/50' :
          idx === 0 ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-300' :
          'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
        ]"
      >
        <!-- Rank badge -->
        <div
          :class="[
            'w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0',
            idx === 0 ? 'bg-yellow-400 text-white shadow-sm' :
            idx === 1 ? 'bg-slate-300 text-slate-700' :
            idx === 2 ? 'bg-amber-600 text-white' :
            'bg-slate-100 text-slate-500 text-xs'
          ]"
        >
          {{ rankLabel(idx) }}
        </div>

        <!-- Name -->
        <div class="flex-1 min-w-0">
          <template v-if="editingId !== prize.id">
            <span class="font-bold text-sm">{{ prize.name }}</span>
          </template>
          <template v-else>
            <input
              v-model="editName"
              @keyup.enter="savePrize(prize.id)"
              @keyup.esc="cancelEdit"
              class="w-full text-sm font-bold border-b border-rose-400 outline-none bg-transparent focus:border-rose-600"
              autofocus
            />
          </template>
        </div>

        <!-- Rank label text -->
        <span v-if="editingId !== prize.id" class="text-xs text-slate-400 font-medium flex-shrink-0">
          第 {{ idx + 1 }} 名
        </span>

        <!-- Actions: always visible (no hover-reveal, so touch devices can tap them) -->
        <div class="flex gap-1 flex-shrink-0">
          <template v-if="editingId !== prize.id">
            <button
              @click="startEdit(prize)"
              class="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 active:bg-rose-50 transition"
            >
              <Edit2 :size="16" />
            </button>
            <button
              @click="deletePrize(prize.id, prize.name)"
              class="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 active:bg-red-50 transition"
            >
              <Trash2 :size="16" />
            </button>
          </template>
          <template v-else>
            <button @click="savePrize(prize.id)" class="p-2 rounded-lg text-green-600 hover:bg-green-50 active:bg-green-50 transition">
              <Check :size="16" />
            </button>
            <button @click="cancelEdit" class="p-2 rounded-lg text-slate-400 hover:bg-slate-100 active:bg-slate-100 transition">
              <X :size="16" />
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-16 text-slate-400">
      <Gift :size="40" class="mx-auto mb-3 opacity-30" />
      <p class="font-bold">尚無獎項</p>
      <p class="text-sm">點擊「新增獎項」開始設定</p>
    </div>

    <p class="text-xs text-slate-400 mt-5">
      獎項順序即為名次對應（第 1 項 = 冠軍，第 2 項 = 亞軍，以此類推）。賽事開始時自動套用。
    </p>
  </div>
</template>
