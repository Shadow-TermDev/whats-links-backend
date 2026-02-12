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

  // ===== Crear admin desde variables de entorno =====
  const adminUsername = process.env.ADMIN_USERNAME || "Erick";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.warn("⚠ ADMIN_PASSWORD no definida. No se creará admin.");
  } else {
    const adminCheck = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(adminUsername);

    if (!adminCheck) {
      const hashed = await bcrypt.hash(adminPassword, 10);

      db.prepare(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
      ).run(adminUsername, hashed, "admin");

      console.log("Admin creado correctamente ✅");
    }
  }

  console.log("Base de datos lista ✅");
}

/* =========================
   OBTENER DB
========================= */
export function getDB() {
  return db;
}
