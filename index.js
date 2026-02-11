import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import categoriesRoutes from './routes/categories.js';
import linksRoutes from './routes/links.js';
import { initDB } from './db.js';

const app = express();

// ===== Inicializar base de datos =====
await initDB();

// ===== Middleware =====
app.use(cors({
  origin: '*', // Cambia por tu dominio de Netlify/Vercel cuando lo tengas
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

// ===== Iniciar servidor =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
