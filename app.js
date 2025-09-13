const express = require('express');
const app = express();
const projectRoutes = require('./routes/projectRoutes');
const authRoutes = require('./routes/authRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');
const cors = require('cors');
app.use(cors({
    origin: 'http://localhost:3001', // or use '*' for development only
    credentials: true, // if you're sending cookies or auth headers
}));
app.use(express.json());
app.use(cookieParser());
app.use('/api/projects',projectRoutes);
app.use('/api/auth',authRoutes);
app.use('/api/gallery',galleryRoutes);
app.use(errorHandler);
module.exports = app;