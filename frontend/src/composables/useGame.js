import { ref, computed, onMounted, onUnmounted } from 'vue'

const TEAM_LABELS = { teamA: 'A 隊', teamB: 'B 隊', teamC: 'C 隊' }
const TEAM_COLORS = { teamA: 'indigo', teamB: 'rose', teamC: 'emerald' }

const state = ref({
  setupComplete: false,
  maxScore: 15,
  deuceLimit: 15,
  playerCount: 18,
  currentView: 'management',
  players: [],
  prizes: [],
  teamsAssigned: false,
  teams: { teamA: [], teamB: [], teamC: [] },
  matchSchedule: [],
  currentMatchIndex: 0,
  matchHistory: []
})

const sortedPlayers = computed(() =>
  [...state.value.players].sort((a, b) => b.points - a.points || a.id - b.id)
)

const currentMatch = computed(() => {
  if (!state.value.teamsAssigned || !state.value.matchSchedule.length) return null
  const match = state.value.matchSchedule[state.value.currentMatchIndex]
  if (!match || match.completed) return null
  return {
    ...match,
    homeName: TEAM_LABELS[match.home],
    awayName: TEAM_LABELS[match.away],
    homeColor: TEAM_COLORS[match.home],
    awayColor: TEAM_COLORS[match.away],
    homePlayers: state.value.players.filter(p => state.value.teams[match.home]?.includes(p.id)),
    awayPlayers: state.value.players.filter(p => state.value.teams[match.away]?.includes(p.id)),
  }
})

const sortByGender = players => [...players].sort((a, b) =>
  (a.gender === 'female' ? 0 : 1) - (b.gender === 'female' ? 0 : 1)
)

const teamPlayers = computed(() => ({
  teamA: sortByGender(state.value.players.filter(p => state.value.teams.teamA?.includes(p.id))),
  teamB: sortByGender(state.value.players.filter(p => state.value.teams.teamB?.includes(p.id))),
  teamC: sortByGender(state.value.players.filter(p => state.value.teams.teamC?.includes(p.id))),
}))

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  return res.json()
}

async function fetchState() {
  state.value = await apiFetch('/api/state')
}

async function setup() {
  state.value = await apiFetch('/api/setup', { method: 'POST' })
}

async function updatePlayer(id, data) {
  state.value = await apiFetch(`/api/players/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

async function generateTeams() {
  state.value = await apiFetch('/api/game/generate-teams', { method: 'POST' })
}

async function swapMatches(from, to) {
  state.value = await apiFetch('/api/game/swap-matches', {
    method: 'POST',
    body: JSON.stringify({ from, to })
  })
}

async function addScore(side, delta) {
  const data = await apiFetch('/api/game/score', {
    method: 'POST',
    body: JSON.stringify({ side, delta })
  })
  const { matchResult, ...newState } = data
  state.value = newState
}

async function endMatch() {
  const data = await apiFetch('/api/game/end-match', { method: 'POST' })
  const { matchResult, ...newState } = data
  state.value = newState
  if (matchResult) {
    const isLastMatch = !newState.teamsAssigned
    setTimeout(async () => {
      if (isLastMatch) {
        alert(`最後一場結束！${matchResult.winner} 獲勝！\n${matchResult.homeName} ${matchResult.scoreHome} : ${matchResult.scoreAway} ${matchResult.awayName}\n\n三場賽事全部結束，請查看最終積分！`)
      } else {
        alert(`比賽結束！${matchResult.winner} 獲勝！\n${matchResult.homeName} ${matchResult.scoreHome} : ${matchResult.scoreAway} ${matchResult.awayName}`)
      }
      await setView('management')
    }, 100)
  }
}

async function updatePrize(idx, name) {
  state.value = await apiFetch(`/api/prizes/${idx}`, {
    method: 'PUT',
    body: JSON.stringify({ name })
  })
}

async function setView(view) {
  state.value = await apiFetch('/api/view', {
    method: 'PUT',
    body: JSON.stringify({ view })
  })
}

async function updateConfig(data) {
  state.value = await apiFetch('/api/admin/config', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

async function resetScores() {
  state.value = await apiFetch('/api/admin/reset-scores', { method: 'POST' })
}

async function resetAll() {
  state.value = await apiFetch('/api/admin/reset-all', { method: 'POST' })
}

function usePolling(intervalMs = 3000) {
  let timer = null
  onMounted(() => {
    timer = setInterval(fetchState, intervalMs)
  })
  onUnmounted(() => {
    clearInterval(timer)
  })
}

export function useGame() {
  return {
    state,
    sortedPlayers,
    currentMatch,
    teamPlayers,
    TEAM_LABELS,
    TEAM_COLORS,
    fetchState,
    setup,
    updatePlayer,
    generateTeams,
    swapMatches,
    addScore,
    endMatch,
    updatePrize,
    setView,
    updateConfig,
    resetScores,
    resetAll,
    usePolling
  }
}
