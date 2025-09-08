const express = require('express');
const app = express();
const projectRoutes = require('./routes/projectRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');

app.use(express.json());
app.use(cookieParser());
app.use('/api/projects',projectRoutes);
app.use('/api/auth',authRoutes);
app.use(errorHandler);
module.exports = app;