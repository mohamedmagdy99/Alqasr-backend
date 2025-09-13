const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const auth = require('../middleware/authMiddleware');
const { createProject, getAllProjects, getProjectById, updateProject, deleteProject } = require('../controllers/projectController');

router.post('/', auth, upload.array('image'), createProject);
router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.put('/:id', auth, upload.array('images'), updateProject);
router.delete('/:id', auth, deleteProject);

module.exports = router;
