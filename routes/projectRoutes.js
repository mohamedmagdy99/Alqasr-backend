const express = require('express');
const router = express.Router();
const validateProject = require('../middleware/validateProject');
const auth = require('../middleware/authMiddleware');
const {createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject
} = require('../controllers/projectController');

router.post('/',auth,validateProject, createProject);
router.get('/',getAllProjects);
router.get('/:id',getProjectById);
router.put('/:id',auth,updateProject);
router.delete('/:id',auth,deleteProject);
module.exports = router;