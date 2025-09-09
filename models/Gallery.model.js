const mongoose = require('mongoose');
const GallerySchema = new mongoose.Schema({
    image: {
        projectId:String,
        type: String,
    }
});
module.exports=mongoose.model('Gallery',GallerySchema);