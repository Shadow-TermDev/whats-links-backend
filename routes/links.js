import express from 'express';
import { getDB } from '../db.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// ===== Subir link =====
router.post('/', verifyToken, (req, res) => {
  let { url, type, name, category } = req.body;

  if (!url || !type || !category || !name)
    return res.status(400).json({ message: 'Datos incompletos' });

  url = url.trim();
  type = type.toLowerCase();
  name = name.trim();
  category = category.trim().toLowerCase();

  if (!['canal', 'grupo'].includes(type))
    return res.status(400).json({ message: 'Tipo inválido' });

  const db = getDB();

  try {
    // ===== Buscar o crear categoría =====
    let catRow = db.prepare('SELECT id FROM categories WHERE name = ?').get(category);
    let categoryId;
    if (catRow) {
      categoryId = catRow.id;
    } else {
      const result = db.prepare('INSERT INTO categories (name, created_by) VALUES (?, ?)').run(category, req.user.id);
      categoryId = result.lastInsertRowid;
    }

    // ===== Verificar si el link ya existe =====
    const exists = db.prepare('SELECT id FROM links WHERE url = ? AND user_id = ?').get(url, req.user.id);
    if (exists) {
      return res.status(400).json({ message: 'Este link ya fue subido' });
    }

    // ===== Insertar link =====
    db.prepare(
      'INSERT INTO links (user_id, name, url, type, category_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, name, url, type, categoryId, new Date().toISOString());

    res.status(201).json({ message: 'Link subido correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al subir link' });
  }
});

// ===== Listar todos los links =====
router.get('/', verifyToken, (req, res) => {
  const db = getDB();

  try {
    const links = db.prepare(`
      SELECT
        links.id,
        links.name,
        links.url,
        links.type,
        users.username AS username,
        categories.name AS category
      FROM links
      LEFT JOIN users ON links.user_id = users.id
      LEFT JOIN categories ON links.category_id = categories.id
      ORDER BY links.created_at DESC
    `).all();

    res.json(links);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener links' });
  }
});

// ===== Eliminar link =====
router.delete('/:id', verifyToken, (req, res) => {
  const db = getDB();
  const linkId = req.params.id;

  try {
    db.prepare('DELETE FROM links WHERE id = ? AND user_id = ?').run(linkId, req.user.id);
    res.json({ message: 'Link eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar link' });
  }
});

// ===== Listar categorías =====
router.get('/categories', verifyToken, (req, res) => {
  const db = getDB();
  try {
    const categories = db.prepare('SELECT id, name, created_by FROM categories ORDER BY name ASC').all();
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener categorías' });
  }
});

// ===== Eliminar categoría =====
router.delete('/categories/:id', verifyToken, (req, res) => {
  const db = getDB();
  const catId = req.params.id;

  try {
    const cat = db.prepare('SELECT created_by FROM categories WHERE id = ?').get(catId);
    if (!cat) return res.status(404).json({ message: 'Categoría no encontrada' });

    if (req.user.role !== 'admin' && req.user.id !== cat.created_by)
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta categoría' });

    db.prepare('DELETE FROM categories WHERE id = ?').run(catId);
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar categoría' });
  }
});

export default router;
