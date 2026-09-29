require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const apiRoutes = require('./src/routes');
const logger = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & utility middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows images to load in React
  })
);

app.use(
  cors({
    origin: true, // Allow any local/network origin
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static files for uploaded photos (dumping proof, waste images, collection proof)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Smart Waste Management System (SWMS) API',
    documentation: '/api/health',
    version: '1.0.0',
  });
});

// 404 Not Found Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'NotFoundError',
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'PayloadTooLarge',
        message: 'Uploaded file is too large. Maximum size is 5MB.',
      });
    }
    return res.status(400).json({
      success: false,
      error: 'UploadError',
      message: err.message,
    });
  }

  logger.error('Unhandled Server Error', { error: err.message, stack: err.stack });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the server.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    logger.info(`🚀 SWMS Backend Server is running on port ${PORT}`);
    logger.info(`   API Root: http://localhost:${PORT}/api`);
    logger.info(`   Uploads: http://localhost:${PORT}/uploads`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Gracefully shutting down.');
    server.close(() => process.exit(0));
  });
}

module.exports = app;
