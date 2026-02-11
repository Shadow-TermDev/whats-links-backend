import fs from 'fs';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';

const DB_FILE = 'database.sqlite';
let SQL;
let db;

/* =========================
   INICIALIZAR BASE DE DATOS
========================= */
export async function initDB() {
  SQL = await initSqlJs();

  // Cargar base de datos si existe, sino crear nueva
  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
    console.log('Base de datos cargada ✅');
  } else {
    db = new SQL.Database();
    console.log('Nueva base de datos creada ✅');
  }

  // ===== Tabla users =====
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ===== Tabla categories =====
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );
  `);

  // ===== Tabla links =====
  db.run(`
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
  const adminCheck = db.exec("SELECT id FROM users WHERE username='Erick'");
  if (!adminCheck.length) {
    const hashed = await bcrypt.hash('admingod123', 10);
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['Erick', hashed, 'admin']);
    saveDB();
    console.log('Admin predefinido Erick creado ✅');
  }
}

/* =========================
   OBTENER DB
========================= */
export function getDB() {
  return db;
}

/* =========================
   GUARDAR DB
========================= */
export function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}