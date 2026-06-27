import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const UPLOADS_DIR = join(__dirname, '..', 'uploads')

;[DATA_DIR, UPLOADS_DIR].forEach(d => {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
})

const ROSTER_FILE = join(DATA_DIR, 'players.json')
const PRIZES_FILE = join(DATA_DIR, 'prizes.json')
const CONFIG_FILE = join(DATA_DIR, 'config.json')

function readJson(file) {
  if (!existsSync(file)) return []
  try { return JSON.parse(readFileSync(file, 'utf-8')) } catch { return [] }
}

function writeJson(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2))
}

function readConfig() {
  if (!existsSync(CONFIG_FILE)) return { maxScore: 15, deuceLimit: 15 }
  try { return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) } catch { return { maxScore: 15, deuceLimit: 15 } }
}

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `player-${Date.now()}${extname(file.originalname)}`)
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

const app = express()
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

const { maxScore: INIT_MAX_SCORE, deuceLimit: INIT_DEUCE_LIMIT } = readConfig()

const MATCH_DEFS = [
  { home: 'teamA', away: 'teamB' },
  { home: 'teamB', away: 'teamC' },
  { home: 'teamC', away: 'teamA' },
]

let state = {
  setupComplete: false,
  maxScore: INIT_MAX_SCORE,
  deuceLimit: INIT_DEUCE_LIMIT,
  currentView: 'management',
  players: [],
  prizes: [],
  teamsAssigned: false,
  teams: { teamA: [], teamB: [], teamC: [] },
  matchSchedule: [],
  currentMatchIndex: 0,
  matchHistory: []
}

// ── WebSocket: real-time state sync ──────────────────────────────────────────
const wss = new WebSocketServer({ noServer: true })

function broadcastState() {
  const msg = JSON.stringify({ type: 'state', payload: state })
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg)
  })
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', payload: state }))
})

// ── Config ──────────────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  const roster = readJson(ROSTER_FILE)
  res.json({ maxScore: state.maxScore, deuceLimit: state.deuceLimit, playerCount: roster.length })
})

// ── Game state ───────────────────────────────────────────────────────────────
app.get('/api/state', (req, res) => {
  res.json(state)
})

// ── Setup ─────────────────────────────────────────────────────────────────────
app.post('/api/setup', (req, res) => {
  const roster = readJson(ROSTER_FILE)
  const prizesConfig = readJson(PRIZES_FILE)

  if (roster.length === 0) {
    return res.status(400).json({ error: '尚無選手，請先至選手管理新增選手' })
  }

  const players = roster.map(p => ({ ...p, points: 0 }))

  const defaultPrizeNames = ['冠軍獎', '亞軍獎', '季軍獎', '殿軍獎', '五獎', '六獎']
  const prizes = prizesConfig.length > 0
    ? prizesConfig.map((p, i) => ({ rank: i + 1, name: p.name }))
    : Array.from({ length: roster.length }, (_, i) => ({
        rank: i + 1,
        name: defaultPrizeNames[i] ?? ''
      }))

  state = {
    ...state,
    setupComplete: true,
    players,
    prizes,
    teamsAssigned: false,
    teams: { teamA: [], teamB: [], teamC: [] },
    matchSchedule: [],
    currentMatchIndex: 0,
    matchHistory: [],
    currentView: 'management'
  }

  broadcastState()
  res.json(state)
})

// ── Roster (pre-game player management) ─────────────────────────────────────
app.get('/api/roster', (req, res) => {
  res.json(readJson(ROSTER_FILE))
})

app.post('/api/roster', (req, res) => {
  const { name, gender } = req.body
  const roster = readJson(ROSTER_FILE)
  const player = { id: Date.now(), name: name || '新球員', gender: gender || 'male', photoUrl: null }
  roster.push(player)
  writeJson(ROSTER_FILE, roster)
  if (state.setupComplete) {
    state.players.push({ ...player, points: 0 })
    broadcastState()
  }
  res.json(player)
})

app.put('/api/roster/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const { name, gender } = req.body
  const roster = readJson(ROSTER_FILE)
  const idx = roster.findIndex(p => p.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  roster[idx] = {
    ...roster[idx],
    ...(name !== undefined && { name }),
    ...(gender !== undefined && { gender })
  }
  writeJson(ROSTER_FILE, roster)
  if (state.setupComplete) {
    state.players = state.players.map(p =>
      p.id !== id ? p : { ...p, ...(name !== undefined && { name }), ...(gender !== undefined && { gender }) }
    )
    broadcastState()
  }
  res.json(roster[idx])
})

app.delete('/api/roster/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const roster = readJson(ROSTER_FILE)
  writeJson(ROSTER_FILE, roster.filter(p => p.id !== id))
  if (state.setupComplete) {
    state.players = state.players.filter(p => p.id !== id)
    broadcastState()
  }
  res.json({ ok: true })
})

app.post('/api/roster/:id/photo', upload.single('photo'), (req, res) => {
  const id = parseInt(req.params.id)
  const roster = readJson(ROSTER_FILE)
  const idx = roster.findIndex(p => p.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  roster[idx].photoUrl = `/uploads/${req.file.filename}`
  writeJson(ROSTER_FILE, roster)
  if (state.setupComplete) {
    state.players = state.players.map(p =>
      p.id === id ? { ...p, photoUrl: roster[idx].photoUrl } : p
    )
    broadcastState()
  }
  res.json(roster[idx])
})

// ── Prizes config (pre-game prize management) ────────────────────────────────
app.get('/api/prizes-config', (req, res) => {
  res.json(readJson(PRIZES_FILE))
})

app.post('/api/prizes-config', (req, res) => {
  const { name } = req.body
  const prizes = readJson(PRIZES_FILE)
  const prize = { id: Date.now(), name: name || '新獎項' }
  prizes.push(prize)
  writeJson(PRIZES_FILE, prizes)
  res.json(prize)
})

app.put('/api/prizes-config/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const { name } = req.body
  const prizes = readJson(PRIZES_FILE)
  const idx = prizes.findIndex(p => p.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  prizes[idx] = { ...prizes[idx], name }
  writeJson(PRIZES_FILE, prizes)
  res.json(prizes[idx])
})

app.delete('/api/prizes-config/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const prizes = readJson(PRIZES_FILE)
  writeJson(PRIZES_FILE, prizes.filter(p => p.id !== id))
  res.json({ ok: true })
})

// ── In-game player update ────────────────────────────────────────────────────
app.put('/api/players/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const { name, gender } = req.body
  state.players = state.players.map(p =>
    p.id !== id ? p : { ...p, ...(name !== undefined && { name }), ...(gender !== undefined && { gender }) }
  )
  broadcastState()
  res.json(state)
})

// ── Teams ────────────────────────────────────────────────────────────────────
app.post('/api/game/generate-teams', (req, res) => {
  const females = [...state.players].filter(p => p.gender === 'female').sort(() => Math.random() - 0.5)
  const males = [...state.players].filter(p => p.gender === 'male').sort(() => Math.random() - 0.5)
  const buckets = [[], [], []]

  const assignBalanced = (list) => {
    list.forEach(p => {
      const minSize = Math.min(...buckets.map(b => b.length))
      const candidates = buckets.map((b, i) => i).filter(i => buckets[i].length === minSize)
      const target = candidates[Math.floor(Math.random() * candidates.length)]
      buckets[target].push(p.id)
    })
  }
  assignBalanced(females)
  assignBalanced(males)

  state.teamsAssigned = true
  state.teams = { teamA: buckets[0], teamB: buckets[1], teamC: buckets[2] }
  state.matchSchedule = MATCH_DEFS.map(m => ({ ...m, scoreHome: 0, scoreAway: 0, completed: false }))
  state.currentMatchIndex = 0
  state.currentView = 'management'
  broadcastState()
  res.json(state)
})

// ── Schedule reorder (only before any match has started) ───────────────────
app.post('/api/game/swap-matches', (req, res) => {
  const { from, to } = req.body
  const hasStarted = state.matchSchedule.some(m => m.completed || m.scoreHome > 0 || m.scoreAway > 0)
  if (hasStarted) return res.status(400).json({ error: '比賽已開始，無法調整賽程順序' })
  if (
    !Number.isInteger(from) || !Number.isInteger(to) ||
    !state.matchSchedule[from] || !state.matchSchedule[to]
  ) return res.status(400).json({ error: 'Invalid indices' })

  const schedule = [...state.matchSchedule]
  ;[schedule[from], schedule[to]] = [schedule[to], schedule[from]]
  state.matchSchedule = schedule
  broadcastState()
  res.json(state)
})

// ── Scoring ──────────────────────────────────────────────────────────────────
app.post('/api/game/score', (req, res) => {
  const { side, delta } = req.body
  const match = state.matchSchedule[state.currentMatchIndex]
  if (!match || match.completed) return res.status(400).json({ error: 'No active match' })

  if (side === 'home') match.scoreHome = Math.max(0, match.scoreHome + delta)
  else match.scoreAway = Math.max(0, match.scoreAway + delta)

  const teamKey = side === 'home' ? match.home : match.away
  state.players = state.players.map(p =>
    state.teams[teamKey].includes(p.id) ? { ...p, points: Math.max(0, p.points + delta) } : p
  )

  broadcastState()
  res.json({ ...state, matchResult: null })
})

// ── End match (manual) ──────────────────────────────────────────────────────
app.post('/api/game/end-match', (req, res) => {
  const match = state.matchSchedule[state.currentMatchIndex]
  if (!match || match.completed) return res.status(400).json({ error: 'No active match' })

  const { scoreHome, scoreAway } = match
  match.completed = true
  const winnerKey = scoreHome >= scoreAway ? match.home : match.away
  const labels = { teamA: 'A 隊', teamB: 'B 隊', teamC: 'C 隊' }
  const matchResult = { winner: labels[winnerKey], scoreHome, scoreAway, homeName: labels[match.home], awayName: labels[match.away] }

  state.matchHistory = [
    { home: match.home, away: match.away, scoreHome, scoreAway, timestamp: new Date() },
    ...state.matchHistory
  ]
  state.currentMatchIndex++

  if (state.currentMatchIndex >= 3) {
    state.teamsAssigned = false
    state.teams = { teamA: [], teamB: [], teamC: [] }
    state.matchSchedule = []
    state.currentMatchIndex = 0
  }

  broadcastState()
  res.json({ ...state, matchResult })
})

// ── In-game prize update ─────────────────────────────────────────────────────
app.put('/api/prizes/:idx', (req, res) => {
  const idx = parseInt(req.params.idx)
  const { name } = req.body
  if (state.prizes[idx]) {
    state.prizes = state.prizes.map((p, i) => (i === idx ? { ...p, name } : p))
  }
  broadcastState()
  res.json(state)
})

// ── Admin: Config ─────────────────────────────────────────────────────────────
app.put('/api/admin/config', (req, res) => {
  const { maxScore, deuceLimit } = req.body
  if (maxScore !== undefined) state.maxScore = parseInt(maxScore)
  if (deuceLimit !== undefined) state.deuceLimit = parseInt(deuceLimit)
  writeJson(CONFIG_FILE, { maxScore: state.maxScore, deuceLimit: state.deuceLimit })
  broadcastState()
  res.json(state)
})

// ── Admin: Danger Zone ───────────────────────────────────────────────────────
app.post('/api/admin/reset-scores', (req, res) => {
  state.players = state.players.map(p => ({ ...p, points: 0 }))
  state.matchSchedule = state.matchSchedule.map(m => ({
    ...m, scoreHome: 0, scoreAway: 0, completed: false
  }))
  state.currentMatchIndex = 0
  state.matchHistory = []
  state.teamsAssigned = false
  state.teams = { teamA: [], teamB: [], teamC: [] }
  broadcastState()
  res.json(state)
})

app.post('/api/admin/reset-all', (req, res) => {
  writeJson(ROSTER_FILE, [])
  writeJson(PRIZES_FILE, [])
  state = {
    setupComplete: false,
    maxScore: state.maxScore,
    deuceLimit: state.deuceLimit,
    currentView: 'management',
    players: [],
    prizes: [],
    teamsAssigned: false,
    teams: { teamA: [], teamB: [], teamC: [] },
    matchSchedule: [],
    currentMatchIndex: 0,
    matchHistory: []
  }
  broadcastState()
  res.json(state)
})

// ── View ─────────────────────────────────────────────────────────────────────
app.put('/api/view', (req, res) => {
  const { view } = req.body
  state.currentView = view
  broadcastState()
  res.json(state)
})

const DIST_DIR = join(__dirname, '..', '..', 'frontend', 'dist')
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get('*', (req, res) => {
    res.sendFile(join(DIST_DIR, 'index.html'))
  })
}

const PORT = process.env.PORT || 3000
const server = createServer(app)

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
  } else {
    socket.destroy()
  }
})

server.listen(PORT, () => {
  console.log(`後端伺服器運行於 http://localhost:${PORT}`)
})
