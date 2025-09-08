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
    image:{
        type:String,
        required:[true,'image is required']
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
    }
});