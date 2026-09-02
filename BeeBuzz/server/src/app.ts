import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './services/database.js';

// Routes
import authRoutes from './routes/auth.js';
import loadRoutes from './routes/loads.js';
import bidRoutes from './routes/bids.js';
import chatRoutes from './routes/chat.js';
import notificationRoutes from './routes/notifications.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';

import { initWebSocketServer } from './services/websocket.js';
import { seedAdmin } from './controllers/adminController.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/loads', loadRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Health Check
app.get('/', (req, res) => {
  res.json({ message: 'BeeBuzz API Running' });
});

// Start Server
async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized');

    // Seed default admin account (hidden from UI)
    await seedAdmin();

    // Initialize WebSocket server on port 3001
    initWebSocketServer();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
