const gallery = require('../models/Gallery.model');

exports.getGallery = async (req, res) => {
    try {
        const gallerys = await gallery.find();
        res.status(200).json({ success: true, data: gallerys });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};