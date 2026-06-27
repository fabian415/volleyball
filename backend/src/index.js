import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pool, initDb, loadConfig, loadGameState, saveGameState } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const UPLOADS_DIR = join(__dirname, '..', 'uploads')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const app = express()
app.use(cors())
app.use(express.json())

const MATCH_DEFS = [
  { home: 'teamA', away: 'teamB' },
  { home: 'teamB', away: 'teamC' },
  { home: 'teamC', away: 'teamA' },
]

let state = {
  setupComplete: false,
  maxScore: 15,
  deuceLimit: 15,
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

async function broadcastState() {
  await saveGameState(state)
  const msg = JSON.stringify({ type: 'state', payload: state })
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg)
  })
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', payload: state }))
})

// ── Config ──────────────────────────────────────────────────────────────────
app.get('/api/config', async (req, res) => {
  const { rows } = await pool.query('SELECT COUNT(*) FROM players')
  res.json({ maxScore: state.maxScore, deuceLimit: state.deuceLimit, playerCount: Number(rows[0].count) })
})

// ── Game state ───────────────────────────────────────────────────────────────
app.get('/api/state', (req, res) => {
  res.json(state)
})

// ── Setup ─────────────────────────────────────────────────────────────────────
app.post('/api/setup', async (req, res) => {
  const { rows: roster } = await pool.query('SELECT id, name, gender, photo_mime FROM players ORDER BY id')

  if (roster.length === 0) {
    return res.status(400).json({ error: '尚無選手，請先至選手管理新增選手' })
  }

  const players = roster.map(p => ({
    id: Number(p.id),
    name: p.name,
    gender: p.gender,
    photoUrl: p.photo_mime ? `/api/photo/${p.id}` : null,
    points: 0
  }))

  const { rows: prizesConfig } = await pool.query('SELECT id, name FROM prizes ORDER BY id')
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

  await broadcastState()
  res.json(state)
})

// ── Roster (pre-game player management) ─────────────────────────────────────
app.get('/api/roster', async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, gender, photo_mime FROM players ORDER BY id')
  res.json(rows.map(p => ({
    id: Number(p.id),
    name: p.name,
    gender: p.gender,
    photoUrl: p.photo_mime ? `/api/photo/${p.id}` : null
  })))
})

app.post('/api/roster', async (req, res) => {
  const { name, gender } = req.body
  const id = Date.now()
  const player = { id, name: name || '新球員', gender: gender || 'male', photoUrl: null }
  await pool.query('INSERT INTO players (id, name, gender) VALUES ($1,$2,$3)', [id, player.name, player.gender])
  if (state.setupComplete) {
    state.players.push({ ...player, points: 0 })
    await broadcastState()
  }
  res.json(player)
})

app.put('/api/roster/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const { name, gender } = req.body
  const { rows } = await pool.query(
    `UPDATE players SET name = COALESCE($2, name), gender = COALESCE($3, gender)
     WHERE id = $1 RETURNING id, name, gender, photo_mime`,
    [id, name, gender]
  )
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
  if (state.setupComplete) {
    state.players = state.players.map(p =>
      p.id !== id ? p : { ...p, ...(name !== undefined && { name }), ...(gender !== undefined && { gender }) }
    )
    await broadcastState()
  }
  const updated = rows[0]
  res.json({ id: Number(updated.id), name: updated.name, gender: updated.gender, photoUrl: updated.photo_mime ? `/api/photo/${id}` : null })
})

app.delete('/api/roster/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  await pool.query('DELETE FROM players WHERE id = $1', [id])
  if (state.setupComplete) {
    state.players = state.players.filter(p => p.id !== id)
    await broadcastState()
  }
  res.json({ ok: true })
})

app.post('/api/roster/:id/photo', upload.single('photo'), async (req, res) => {
  const id = parseInt(req.params.id)
  const { rows } = await pool.query(
    'UPDATE players SET photo = $2, photo_mime = $3 WHERE id = $1 RETURNING id, name, gender',
    [id, req.file.buffer, req.file.mimetype]
  )
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
  const photoUrl = `/api/photo/${id}`
  if (state.setupComplete) {
    state.players = state.players.map(p => p.id === id ? { ...p, photoUrl } : p)
    await broadcastState()
  }
  const updated = rows[0]
  res.json({ id: Number(updated.id), name: updated.name, gender: updated.gender, photoUrl })
})

// ── Photo storage (served from the database, not local disk) ───────────────
app.get('/api/photo/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const { rows } = await pool.query('SELECT photo, photo_mime FROM players WHERE id = $1', [id])
  if (rows.length === 0 || !rows[0].photo) return res.status(404).end()
  res.set('Content-Type', rows[0].photo_mime || 'application/octet-stream')
  res.set('Cache-Control', 'public, max-age=31536000, immutable')
  res.send(rows[0].photo)
})

// ── Prizes config (pre-game prize management) ────────────────────────────────
app.get('/api/prizes-config', async (req, res) => {
  const { rows } = await pool.query('SELECT id, name FROM prizes ORDER BY id')
  res.json(rows.map(p => ({ id: Number(p.id), name: p.name })))
})

app.post('/api/prizes-config', async (req, res) => {
  const { name } = req.body
  const id = Date.now()
  const prize = { id, name: name || '新獎項' }
  await pool.query('INSERT INTO prizes (id, name) VALUES ($1,$2)', [id, prize.name])
  res.json(prize)
})

app.put('/api/prizes-config/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const { name } = req.body
  const { rows } = await pool.query('UPDATE prizes SET name = $2 WHERE id = $1 RETURNING id, name', [id, name])
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
  res.json({ id: Number(rows[0].id), name: rows[0].name })
})

app.delete('/api/prizes-config/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  await pool.query('DELETE FROM prizes WHERE id = $1', [id])
  res.json({ ok: true })
})

// ── In-game player update ────────────────────────────────────────────────────
app.put('/api/players/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const { name, gender } = req.body
  await pool.query(
    'UPDATE players SET name = COALESCE($2, name), gender = COALESCE($3, gender) WHERE id = $1',
    [id, name, gender]
  )
  state.players = state.players.map(p =>
    p.id !== id ? p : { ...p, ...(name !== undefined && { name }), ...(gender !== undefined && { gender }) }
  )
  await broadcastState()
  res.json(state)
})

// ── Teams ────────────────────────────────────────────────────────────────────
app.post('/api/game/generate-teams', async (req, res) => {
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
  await broadcastState()
  res.json(state)
})

// ── Schedule reorder (only before any match has started) ───────────────────
app.post('/api/game/swap-matches', async (req, res) => {
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
  await broadcastState()
  res.json(state)
})

// ── Scoring ──────────────────────────────────────────────────────────────────
app.post('/api/game/score', async (req, res) => {
  const { side, delta } = req.body
  const match = state.matchSchedule[state.currentMatchIndex]
  if (!match || match.completed) return res.status(400).json({ error: 'No active match' })

  if (side === 'home') match.scoreHome = Math.max(0, match.scoreHome + delta)
  else match.scoreAway = Math.max(0, match.scoreAway + delta)

  const teamKey = side === 'home' ? match.home : match.away
  state.players = state.players.map(p =>
    state.teams[teamKey].includes(p.id) ? { ...p, points: Math.max(0, p.points + delta) } : p
  )

  await broadcastState()
  res.json({ ...state, matchResult: null })
})

// ── End match (manual) ──────────────────────────────────────────────────────
app.post('/api/game/end-match', async (req, res) => {
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

  await broadcastState()
  res.json({ ...state, matchResult })
})

// ── In-game prize update ─────────────────────────────────────────────────────
app.put('/api/prizes/:idx', async (req, res) => {
  const idx = parseInt(req.params.idx)
  const { name } = req.body
  if (state.prizes[idx]) {
    state.prizes = state.prizes.map((p, i) => (i === idx ? { ...p, name } : p))
  }
  await broadcastState()
  res.json(state)
})

// ── Admin: Config ─────────────────────────────────────────────────────────────
app.put('/api/admin/config', async (req, res) => {
  const { maxScore, deuceLimit } = req.body
  if (maxScore !== undefined) state.maxScore = parseInt(maxScore)
  if (deuceLimit !== undefined) state.deuceLimit = parseInt(deuceLimit)
  await pool.query(
    `INSERT INTO config (id, max_score, deuce_limit) VALUES (1, $1, $2)
     ON CONFLICT (id) DO UPDATE SET max_score = $1, deuce_limit = $2`,
    [state.maxScore, state.deuceLimit]
  )
  await broadcastState()
  res.json(state)
})

// ── Admin: Danger Zone ───────────────────────────────────────────────────────
app.post('/api/admin/reset-scores', async (req, res) => {
  state.players = state.players.map(p => ({ ...p, points: 0 }))
  state.matchSchedule = state.matchSchedule.map(m => ({
    ...m, scoreHome: 0, scoreAway: 0, completed: false
  }))
  state.currentMatchIndex = 0
  state.matchHistory = []
  state.teamsAssigned = false
  state.teams = { teamA: [], teamB: [], teamC: [] }
  await broadcastState()
  res.json(state)
})

app.post('/api/admin/reset-all', async (req, res) => {
  await pool.query('DELETE FROM players')
  await pool.query('DELETE FROM prizes')
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
  await broadcastState()
  res.json(state)
})

// ── View ─────────────────────────────────────────────────────────────────────
app.put('/api/view', async (req, res) => {
  const { view } = req.body
  state.currentView = view
  await broadcastState()
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

async function main() {
  await initDb({ dataDir: DATA_DIR, uploadsDir: UPLOADS_DIR })

  const { maxScore, deuceLimit } = await loadConfig()
  const savedState = await loadGameState()
  state = { ...state, ...(savedState || {}), maxScore, deuceLimit }

  server.listen(PORT, () => {
    console.log(`後端伺服器運行於 http://localhost:${PORT}（資料儲存於遠端 PostgreSQL）`)
  })
}

main()
