/* ==========================================================================
   GlowGuide backend — server.js
   Express app entry point. Route modules are mounted here; each route
   file owns its own controller wiring.
   ========================================================================== */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// CORS: the frontend is static HTML/JS, often opened as file:// (Origin: "null")
// or served from a local static server — allow only the configured origins,
// and allow credentials so the HTTP-only auth cookie can be sent/received.
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '3mb' })); // journal entries can carry a base64 image
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/routines', require('./routes/routineRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/journal', require('./routes/journalRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/looks', require('./routes/lookRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`GlowGuide API listening on port ${PORT}`));
