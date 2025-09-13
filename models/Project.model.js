const mongoose = require('mongoose');
const ProjectSchema = mongoose.Schema({
    title:{
        type:String,
        required:[true,'title is required']
    },
    type:{
        type:String,
        required:[true,'type is required']
    },
    description:{
        type:String,
    },
    image: {
        type: [String],
        required: [true, 'At least one image is required'],
        validate: {
            validator: function (arr) {
                return Array.isArray(arr) && arr.length > 0;
            },
            message: 'Project must include at least one image'
        }
    },
    status:{
        type:String,
        required:[true,'status is required']
    },
    location:{
        type:String,
    },
    completionDate:{
        type:Date,
    },
    features:{
        type:[String],
    }
},{timestamps:true});

const Project = mongoose.model('Project',ProjectSchema);
module.exports = Project;