const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { env } = require('./config/env');
const { API_PREFIX, UPLOADS_DIR } = require('./config/constants');
const { testConnection } = require('./database/connection');
const apiRoutes = require('./routes');
const notFound = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');
const { sendSuccess } = require('./utils/apiResponse');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/health', async (req, res, next) => {
  try {
    await testConnection();
    return sendSuccess(res, 'Server is healthy', {
      status: 'ok',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

app.use(API_PREFIX, apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
