const express = require('express');
const routes = require('./routes');
const mockRoutes = require('./routes/mockRoutes');
const ServerPinger = require('./utils/serverPingerUtils');
const morgan = require('morgan');
const cors = require('cors');
const path = require("path");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(morgan('dev'));
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT','PATCH', 'DELETE'], // Allow specific methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allow specific headers
}));

app.use('/api/v1', routes);
app.use('', mockRoutes);

const pinger = new ServerPinger({
  url: (process.env.PING_URL || 'http://localhost:3000') + '/api/v1/ping',
  intervalMinutes: process.env.PING_INTERVAL || 5
});
pinger.start();

// Serve static files from the React build folder
app.use(express.static(path.join(__dirname, "../dist")));

// Handle React routing, return all requests to React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));