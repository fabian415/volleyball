import pg from 'pg'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const { Pool } = pg

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const MIME_BY_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }

export async function initDb({ dataDir, uploadsDir }) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id BIGINT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'male',
      photo BYTEA,
      photo_mime TEXT
    );
    CREATE TABLE IF NOT EXISTS prizes (
      id BIGINT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS config (
      id INT PRIMARY KEY DEFAULT 1,
      max_score INT NOT NULL DEFAULT 15,
      deuce_limit INT NOT NULL DEFAULT 15
    );
    CREATE TABLE IF NOT EXISTS game_state (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `)

  await migrateLegacyData(dataDir, uploadsDir)
}

// One-time import of the old local JSON/upload files into Postgres.
// Safe to call on every startup: it no-ops once the players table is non-empty.
async function migrateLegacyData(dataDir, uploadsDir) {
  const { rows } = await pool.query('SELECT COUNT(*) FROM players')
  if (Number(rows[0].count) > 0) return

  const rosterFile = join(dataDir, 'players.json')
  if (existsSync(rosterFile)) {
    const roster = JSON.parse(readFileSync(rosterFile, 'utf-8'))
    for (const p of roster) {
      let photo = null
      let mime = null
      if (p.photoUrl) {
        const filePath = join(uploadsDir, p.photoUrl.replace('/uploads/', ''))
        if (existsSync(filePath)) {
          photo = readFileSync(filePath)
          mime = MIME_BY_EXT[extname(filePath).toLowerCase()] || 'image/jpeg'
        }
      }
      await pool.query(
        'INSERT INTO players (id, name, gender, photo, photo_mime) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
        [p.id, p.name, p.gender, photo, mime]
      )
    }
    console.log(`已將 ${roster.length} 位選手（含照片）匯入遠端資料庫`)
  }

  const prizesFile = join(dataDir, 'prizes.json')
  if (existsSync(prizesFile)) {
    const prizes = JSON.parse(readFileSync(prizesFile, 'utf-8'))
    for (const pr of prizes) {
      await pool.query('INSERT INTO prizes (id, name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING', [pr.id, pr.name])
    }
  }

  const configFile = join(dataDir, 'config.json')
  if (existsSync(configFile)) {
    const cfg = JSON.parse(readFileSync(configFile, 'utf-8'))
    await pool.query(
      `INSERT INTO config (id, max_score, deuce_limit) VALUES (1, $1, $2)
       ON CONFLICT (id) DO UPDATE SET max_score = $1, deuce_limit = $2`,
      [cfg.maxScore ?? 15, cfg.deuceLimit ?? 15]
    )
    console.log('已將賽事設定匯入遠端資料庫')
  }
}

export async function loadConfig() {
  const { rows } = await pool.query('SELECT max_score, deuce_limit FROM config WHERE id = 1')
  if (rows.length === 0) return { maxScore: 15, deuceLimit: 15 }
  return { maxScore: rows[0].max_score, deuceLimit: rows[0].deuce_limit }
}

export async function loadGameState() {
  const { rows } = await pool.query('SELECT data FROM game_state WHERE id = 1')
  return rows.length ? rows[0].data : null
}

export async function saveGameState(state) {
  await pool.query(
    `INSERT INTO game_state (id, data) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET data = $1`,
    [JSON.stringify(state)]
  )
}
