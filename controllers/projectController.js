const mongoose = require('mongoose');
const Project = require('../models/Project.model');
const gallery = require('../models/Gallery.model');

function normalizeImages(body) {
    let imgs = body?.images;
    if (!imgs && body?.image) imgs = [body.image];
    if (!imgs) return [];
    return Array.isArray(imgs) ? imgs.filter(Boolean) : [imgs].filter(Boolean);
}

exports.createProject = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const project = await Project.create(req.body, { session });

        const images = normalizeImages(req.body);
        if (images.length) {
            const docs = images.map((img) => ({
                project: project._id,
                image: img
            }));
            await gallery.insertMany(docs, { session });
        }

        await session.commitTransaction();
        res.status(201).json({ success: true, data: project });
    } catch (err) {
        await session.abortTransaction();
        res.status(400).json({ success: false, err: err.message });
    } finally {
        session.endSession();
    }
};

exports.getAllProjects = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, type } = req.query;
        const skip = (page - 1) * limit;

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

exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, err: 'project not found' });
        }
        res.status(200).json({ success: true, data: project });
    } catch (err) {
        res.status(500).json({ success: false, err: err.message });
    }
};

exports.updateProject = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true, session }
        );

        if (!project) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, err: 'project not found' });
        }

        const imagesProvided = Object.prototype.hasOwnProperty.call(req.body, 'images') ||
            Object.prototype.hasOwnProperty.call(req.body, 'image');

        if (imagesProvided) {
            await gallery.deleteMany({ project: project._id }, { session });

            const images = normalizeImages(req.body);
            if (images.length) {
                const docs = images.map((img) => ({
                    project: project._id,
                    image: img
                }));
                await gallery.insertMany(docs, { session });
            }
        }

        await session.commitTransaction();
        res.status(200).json({ success: true, data: project });
    } catch (err) {
        await session.abortTransaction();
        res.status(400).json({ success: false, err: err.message });
    } finally {
        session.endSession();
    }
};

exports.deleteProject = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const project = await Project.findByIdAndDelete(req.params.id, { session });
        if (!project) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, err: 'project not found' });
        }

        await gallery.deleteMany({ project: project._id }, { session });

        await session.commitTransaction();
        res.status(200).json({ success: true, data: project });
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ success: false, err: err.message });
    } finally {
        session.endSession();
    }
};