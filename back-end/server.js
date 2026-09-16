require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const initSocket = require('./src/sockets/socket');
const { startScheduledJobs } = require('./src/utils/scheduler.util');
const logger = require('./src/utils/logger.util');
const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  fs.mkdirSync(path.join(__dirname, 'logs'));
}

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  pingTimeout: 60000,
});

app.set('io', io);
initSocket(io);

const startServer = async () => {
  try {
    await connectDB();

    const { ensureWalkInCustomer } = require('./src/utils/walkin.util');
    await ensureWalkInCustomer();
    logger.info('Walk-in customer ready.');

    server.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      logger.info(`API Base URL: http://localhost:${PORT}/api`);
      logger.info(`Health Check:  http://localhost:${PORT}/api/health`);
    });

    startScheduledJobs();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

startServer();
