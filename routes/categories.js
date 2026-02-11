import express from 'express';
import { getDB, saveDB } from '../db.js';
import { verifyToken } from './auth.js';

const router = express.Router();

/* =========================
   LISTAR CATEGORÍAS
========================= */
router.get('/', verifyToken, (req, res) => {
  const db = getDB();
  try {
    const result = db.exec("SELECT id, name FROM categories ORDER BY name ASC");
    const categories = result.length ? result[0].values.map(r => ({ id: r[0], name: r[1] })) : [];
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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: solo admin' });
  }

  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Nombre de categoría requerido' });

  const db = getDB();

  try {
    // Validar si ya existe la categoría
    const exists = db.exec("SELECT id FROM categories WHERE name = ?", [name]);
    if (exists.length) return res.status(400).json({ message: 'La categoría ya existe' });

    // Insertar categoría
    db.run("INSERT INTO categories (name, created_by) VALUES (?, ?)", [name, req.user.id]);
    saveDB();
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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: solo admin' });
  }

  const { name } = req.params;
  if (!name) return res.status(400).json({ message: 'Nombre de categoría requerido' });

  const db = getDB();
  try {
    const exists = db.exec("SELECT id FROM categories WHERE name = ?", [name]);
    if (!exists.length) return res.status(404).json({ message: 'Categoría no encontrada' });

    db.run("DELETE FROM categories WHERE name = ?", [name]);
    saveDB();
    res.json({ message: 'Categoría eliminada ✅' });
  } catch (err) {
    console.error('Error eliminando categoría:', err);
    res.status(500).json({ message: 'Error al eliminar categoría' });
  }
});

export default router;