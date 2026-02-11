import express from 'express';
import { getDB, saveDB } from '../db.js';
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
    let catResult = db.exec('SELECT id FROM categories WHERE name = ?', [category]);
    let categoryId;
    if (catResult.length) {
      categoryId = catResult[0].values[0][0];
    } else {
      db.run('INSERT INTO categories (name, created_by) VALUES (?, ?)', [category, req.user.id]);
      const newCat = db.exec('SELECT id FROM categories WHERE name = ?', [category]);
      categoryId = newCat[0].values[0][0];
    }

    // ===== Verificar si el link ya existe =====
    const exists = db.exec(
      'SELECT id FROM links WHERE url = ? AND user_id = ?',
      [url, req.user.id]
    );
    if (exists.length) {
      return res.status(400).json({ message: 'Este link ya fue subido' });
    }

    // ===== Insertar link =====
    db.run(
      'INSERT INTO links (user_id, name, url, type, category_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, name, url, type, categoryId, new Date().toISOString()]
    );

    saveDB();
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
    // ===== Solución: usar JOIN y seleccionar columnas existentes =====
    const result = db.exec(`
      SELECT 
        links.id,
        links.name,
        links.url,
        links.type,
        users.username AS owner,
        categories.name AS category
      FROM links
      LEFT JOIN users ON links.user_id = users.id
      LEFT JOIN categories ON links.category_id = categories.id
      ORDER BY links.created_at DESC
    `);

    const links = result.length
      ? result[0].values.map(r => ({
          id: r[0],
          name: r[1],
          url: r[2],
          type: r[3],
          username: r[4],
          category: r[5]
        }))
      : [];

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
    db.run('DELETE FROM links WHERE id = ? AND user_id = ?', [linkId, req.user.id]);
    saveDB();
    res.json({ message: 'Link eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar link' });
  }
});

// ===== Listar categorías (para frontend) =====
router.get('/categories', verifyToken, (req, res) => {
  const db = getDB();
  try {
    const result = db.exec('SELECT id, name, created_by FROM categories ORDER BY name ASC');
    const categories = result.length
      ? result[0].values.map(r => ({ id: r[0], name: r[1], created_by: r[2] }))
      : [];
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener categorías' });
  }
});

// ===== Eliminar categoría (solo admins o creador) =====
router.delete('/categories/:id', verifyToken, (req, res) => {
  const db = getDB();
  const catId = req.params.id;

  try {
    const result = db.exec('SELECT created_by FROM categories WHERE id = ?', [catId]);
    if (!result.length) return res.status(404).json({ message: 'Categoría no encontrada' });

    const creatorId = result[0].values[0][0];
    if (req.user.role !== 'admin' && req.user.id !== creatorId)
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta categoría' });

    db.run('DELETE FROM categories WHERE id = ?', [catId]);
    saveDB();
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar categoría' });
  }
});

export default router;