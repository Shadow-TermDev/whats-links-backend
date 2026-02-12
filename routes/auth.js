import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from '../db.js';

const router = express.Router();

// ================= Middleware para verificar token =================
export function verifyToken(req, res, next) {
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

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists)
    return res.status(400).json({ message: 'El usuario ya existe' });

  const hashed = await bcrypt.hash(password, 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashed, 'user');

  res.status(201).json({ message: 'Usuario registrado con éxito' });
});

// ================= Login =================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = getDB();

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user)
    return res.status(400).json({ message: 'Credenciales incorrectas' });

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
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(newUsername);
  if (exists) return res.status(400).json({ message: 'Usuario ya existe' });

  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(newUsername, req.user.id);
  res.json({ message: 'Username actualizado', username: newUsername });
});

// ================= Listar perfiles =================
router.get('/profiles', verifyToken, (req, res) => {
  const db = getDB();
  const profiles = db.prepare('SELECT id, username, role FROM users').all();
  res.json(profiles);
});

// ================= Eliminar cuenta =================
router.delete('/delete', verifyToken, async (req, res) => {
  const { password } = req.body;
  const db = getDB();

  if (!password) return res.status(400).json({ message: 'Contraseña requerida' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

  if (user.role === 'admin')
    return res.status(403).json({ message: 'La cuenta admin no puede eliminarse' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Contraseña incorrecta' });

  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  res.json({ message: 'Cuenta eliminada con éxito' });
});

export default router;
