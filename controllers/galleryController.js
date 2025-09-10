const gallery = require('../models/Gallery.model');

exports.getGallery = async (req, res) => {
    try {
        const gallerys = await gallery.find();
        res.status(200).json({ success: true, data: gallerys });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.addToGallery = async (req, res) => {
    try {
        const { project, images } = req.body;

        if (!project || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }

        const docs = images.map((img) => ({
            project,
            image: img
        }));

        await gallery.insertMany(docs);
        res.status(201).json({ success: true, count: docs.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
