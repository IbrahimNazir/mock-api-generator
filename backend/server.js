const express = require('express');
const routes = require('./routes');
const mockRoutes = require('./routes/mockRoutes');
const ServerPinger = require('./utils/serverPingerUtils');
const morgan = require('morgan');
const app = express();

app.use(express.json());
app.use(morgan('dev'));

app.use('/api/v1', routes);
app.use('', mockRoutes);



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));