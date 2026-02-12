import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import categoriesRoutes from './routes/categories.js';
import linksRoutes from './routes/links.js';
import { initDB } from './db.js';

const app = express();

// ===== Middleware =====
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ===== Rutas de API =====
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/links', linksRoutes);

// ===== Ruta raíz =====
app.get('/', (req, res) => {
  res.json({ message: 'API WhatsApp Links funcionando ✅' });
});

// ===== Arranque =====
async function main() {
  await initDB();
  const PORT = parseInt(process.env.PORT, 10) || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error('Error fatal al iniciar:', err);
  process.exit(1);
});
