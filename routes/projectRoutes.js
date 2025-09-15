// routes/projectRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer'); // <-- import multer here
const upload = require('../middleware/upload');
const auth = require('../middleware/authMiddleware');
const {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject
} = require('../controllers/projectController');

// Multer wrapper with error handling
const handleUpload = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 5 }
]);

const uploadMiddleware = (req, res, next) => {
    handleUpload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        next();
    });
};

// Routes
router.post('/', auth, uploadMiddleware, createProject);
router.put('/:id', auth, uploadMiddleware, updateProject);
router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.delete('/:id', auth, deleteProject);

module.exports = router;
