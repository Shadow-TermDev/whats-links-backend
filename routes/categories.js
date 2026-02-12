import express from 'express';
import { getDB } from '../db.js';
import { verifyToken } from './auth.js';

const router = express.Router();

/* =========================
   LISTAR CATEGORÍAS
========================= */
router.get('/', verifyToken, (req, res) => {
  const db = getDB();
  try {
    const categories = db.prepare('SELECT id, name FROM categories ORDER BY name ASC').all();
    res.json(categories);
  } catch (err) {
    console.error('Error al cargar categorías:', err);
    res.status(500).json({ message: 'Error al cargar categorías' });
  }
});

/* =========================
   CREAR CATEGORÍA (SOLO ADMIN)
========================= */
router.post('/', verifyToken, (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Acceso denegado: solo admin' });

  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Nombre de categoría requerido' });

  const db = getDB();
  try {
    const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (exists) return res.status(400).json({ message: 'La categoría ya existe' });

    db.prepare('INSERT INTO categories (name, created_by) VALUES (?, ?)').run(name, req.user.id);
    res.status(201).json({ message: 'Categoría creada ✅' });
  } catch (err) {
    console.error('Error creando categoría:', err);
    res.status(500).json({ message: 'Error al crear categoría' });
  }
});

/* =========================
   ELIMINAR CATEGORÍA (SOLO ADMIN)
========================= */
router.delete('/:name', verifyToken, (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Acceso denegado: solo admin' });

  const { name } = req.params;
  if (!name) return res.status(400).json({ message: 'Nombre de categoría requerido' });

  const db = getDB();
  try {
    const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (!exists) return res.status(404).json({ message: 'Categoría no encontrada' });

    db.prepare('DELETE FROM categories WHERE name = ?').run(name);
    res.json({ message: 'Categoría eliminada ✅' });
  } catch (err) {
    console.error('Error eliminando categoría:', err);
    res.status(500).json({ message: 'Error al eliminar categoría' });
  }
});

export default router;
