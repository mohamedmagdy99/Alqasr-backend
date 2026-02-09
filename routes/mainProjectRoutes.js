const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = require("../middleware/upload");
const auth = require("../middleware/authMiddleware");

const {
  createMainProject,
  getAllMainProjects,
  getMainProjectById,
  updateMainProject,
  deleteMainProject,
} = require("../controllers/mainProjectController");
const handleUpload = upload.fields([{ name: "image", maxCount: 30 }]);
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
router.post("/", uploadMiddleware, createMainProject);
router.get("/", getAllMainProjects);
router.get("/:id", getMainProjectById);
router.put(
  "/:id",
  auth,
  upload.fields([{ name: "image", maxCount: 30 }]),
  updateMainProject
);
router.delete("/:id", deleteMainProject);

module.exports = router;
