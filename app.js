const express = require('express');
const app = express();
const projectRoutes = require('./routes/projectRoutes');
const authRoutes = require('./routes/authRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const allowedOrigins = [
    "http://localhost:3001",
    "https://alqasy-realestate-development.vercel.app",
    "https://elqasr-development.com"
];

app.use(
    cors({
        origin: function (origin, callback) {
            // allow requests with no origin (like Postman or curl)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            } else {
                return callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true, // allow credentials (cookies, headers, etc.) if needed
    })
);
app.use(express.json());
app.use(cookieParser());
app.use('/api/projects',projectRoutes);
app.use('/api/auth',authRoutes);
app.use('/api/gallery',galleryRoutes);
app.use(errorHandler);
module.exports = app;