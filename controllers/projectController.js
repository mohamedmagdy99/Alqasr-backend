const Project = require('../models/Project.model');

exports.createProject =async (req, res) => {
    try{
        const project = await Project.create(req.body);
        res.status(201).json({success:true,data:project});
    }catch(err){
        res.status(400).json({success:false,err:err.message});
    }
};

exports.getAllProjects = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, type } = req.query;
        const skip = (page - 1) * limit;

        // Build dynamic filter
        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;

        const total = await Project.countDocuments(filter);
        const projects = await Project.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: projects.length,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            filters: { status, type },
            data: projects
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.getProjectById = async (req,res)=>{
    try{
        const project = await Project.findById(req.params.id);
        if(!project){
            return res.status(404).json({success:false,err:'project not found'});
        }
        res.status(200).json({success:true,data:project});
    }catch (err){
        res.status(500).json({success:false,err:err.message});
    }
};

exports.updateProject = async (req,res)=>{
    try{
        const project = await Project.findByIdAndUpdate(req.params.id,req.body,{new:true, runValidators:true});
        if(!project){
            return res.status(404).json({success:false,err:'project not found'});
        }
        res.status(200).json({success:true,data:project});
    }catch (err){
        res.status(400).json({success:false,err:err.message});
    }
};

exports.deleteProject = async (req,res)=>{
    try{
        const project = await Project.findByIdAndDelete(req.params.id);
        if(!project){
            return res.status(404).json({success:false,err:'project not found'});
        }
        res.status(200).json({success:true,data:project});
    }catch (err){
        res.status(500).json({success:false,err:err.message});
    }
};