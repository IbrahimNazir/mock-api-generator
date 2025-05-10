const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const apiRoutes = require('./routes/apiRoutes');
const mockRoutes = require('./routes/mockRoutes');
const authRoutes = require('./routes/authRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: 'http://localhost:5174', // Allow frontend origin
    credentials: true, // Allow cookies and credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  })
);

app.use(helmet());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/mock', mockRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Express Mock API Generator',
    docs: 'Use /api to create and manage your APIs, and /mock/:apiId/* to access your mock endpoints'
  });
});

// Not found handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});