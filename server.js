const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet for HTTP headers protection
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate Limiting - General
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiting - Login (stricter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
});

// Rate Limiting - OTP Requests
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute
  message: 'Too many OTP requests, please try again later.',
});

app.use('/api/', limiter);

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voting_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// ============================================================================
// STATIC FILES
// ============================================================================

app.use(express.static('public'));

// ============================================================================
// ROUTES
// ============================================================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Authentication Routes
app.use('/api/auth', loginLimiter, require('./routes/auth'));

// Voting Routes
app.use('/api/voting', require('./routes/voting'));

// Admin Routes
app.use('/api/admin', require('./routes/admin'));

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Secure Voting System Started`);
});

module.exports = app;
