import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'database.sqlite');

let db;

/* =========================
   INICIALIZAR BASE DE DATOS
========================= */
export async function initDB() {
  db = new Database(DB_FILE);

  // WAL mode para mejor rendimiento
  db.pragma('journal_mode = WAL');

  // ===== Tabla users =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ===== Tabla categories =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );
  `);

  // ===== Tabla links =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT NOT NULL,
      category_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );
  `);

  // ===== Crear admin predefinido =====
  const adminCheck = db.prepare("SELECT id FROM users WHERE username='Erick'").get();
  if (!adminCheck) {
    const hashed = await bcrypt.hash('admingod123', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('Erick', hashed, 'admin');
    console.log('Admin predefinido Erick creado ✅');
  }

  console.log('Base de datos lista ✅');
}

/* =========================
   OBTENER DB
========================= */
export function getDB() {
  return db;
}

/* =========================
   GUARDAR DB (no-op con better-sqlite3, escribe automáticamente)
========================= */
export function saveDB() {
  // better-sqlite3 escribe directamente al archivo, no necesita export manual
}
