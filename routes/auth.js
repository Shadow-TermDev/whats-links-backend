import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB, saveDB } from '../db.js';

const router = express.Router();

// ================= Middleware para verificar token =================
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token requerido' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token inválido' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

// ================= Registro =================
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const db = getDB();

  if (!username || !password) 
    return res.status(400).json({ message: 'Datos incompletos' });

  if (password.length < 8) 
    return res.status(400).json({ message: 'Mínimo 8 caracteres' });

  const exists = db.exec('SELECT id FROM users WHERE username = ?', [username]);
  if (exists.length) 
    return res.status(400).json({ message: 'El usuario ya existe' });

  const hashed = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashed, 'user']);
  saveDB();

  res.status(201).json({ message: 'Usuario registrado con éxito' });
});

// ================= Login =================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = getDB();
  const result = db.exec('SELECT * FROM users WHERE username = ?', [username]);

  if (!result.length) 
    return res.status(400).json({ message: 'Credenciales incorrectas' });

  const user = {};
  result[0].columns.forEach((col, i) => (user[col] = result[0].values[0][i]));

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) 
    return res.status(400).json({ message: 'Credenciales incorrectas' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, role: user.role, username: user.username });
});

// ================= Mi perfil =================
router.get('/me', verifyToken, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

// ================= Cambiar username =================
router.put('/username', verifyToken, (req, res) => {
  const { newUsername } = req.body;
  if (!newUsername) return res.status(400).json({ message: 'Nuevo username requerido' });

  const db = getDB();
  const exists = db.exec('SELECT id FROM users WHERE username = ?', [newUsername]);
  if (exists.length) return res.status(400).json({ message: 'Usuario ya existe' });

  db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, req.user.id]);
  saveDB();

  res.json({ message: 'Username actualizado', username: newUsername });
});

// ================= Listar perfiles =================
router.get('/profiles', verifyToken, (req, res) => {
  const db = getDB();
  const result = db.exec('SELECT id, username, role FROM users');
  const profiles = result.length ? result[0].values.map(r => ({ id: r[0], username: r[1], role: r[2] })) : [];
  res.json(profiles);
});

// ================= Eliminar cuenta =================
router.delete('/delete', verifyToken, async (req, res) => {
  const { password } = req.body;
  const db = getDB();

  if (!password) return res.status(400).json({ message: 'Contraseña requerida' });

  const result = db.exec('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!result.length) return res.status(404).json({ message: 'Usuario no encontrado' });

  const user = {};
  result[0].columns.forEach((col, i) => (user[col] = result[0].values[0][i]));

  if (user.role === 'admin') 
    return res.status(403).json({ message: 'La cuenta admin no puede eliminarse' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Contraseña incorrecta' });

  db.run('DELETE FROM users WHERE id = ?', [user.id]);
  saveDB();

  res.json({ message: 'Cuenta eliminada con éxito' });
});

export default router;
export { verifyToken };