const express = require('express');
const routes = require('./routes');
const mockRoutes = require('./routes/mockRoutes');
const ServerPinger = require('./utils/serverPingerUtils');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(morgan('dev'));
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allow specific headers
}));

app.use('/api/v1', routes);
app.use('', mockRoutes);

const pinger = new ServerPinger({
  url: 'https://mock-api-generator.onrender.com/api/v1/ping',
  intervalMinutes: 14
});

pinger.start();


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));