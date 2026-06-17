const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { env } = require('./config/env');
const { testConnection, closeConnection } = require('./database/connection');

function bootstrapSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

async function startServer() {
  await testConnection();
  console.log('Database connection established');
console.log('TMN:', process.env.VNP_TMN_CODE);
console.log('SECRET:', process.env.VNP_HASH_SECRET?.substring(0,5));
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  bootstrapSocket(io);
  app.set('io', io);

  server.listen(env.PORT, env.HOST, () => {
    console.log(
      `Server running on http://${env.HOST}:${env.PORT} [${env.NODE_ENV}]`
    );
    console.log(`API base path: /api/v1`);
    console.log(`Socket.IO ready`);
  });

  const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);

    server.close(async () => {
      try {
        await closeConnection();
        console.log('Database connection closed');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
