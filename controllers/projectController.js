const mongoose = require('mongoose');
const Project = require('../models/Project.model');
const gallery = require('../models/Gallery.model');
const { uploadToS3 } = require('../utils/s3Uploader');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../utils/s3Client'); // your configured S3Client
const extractKeyFromUrl = (url) => url.split('/').slice(3).join('/');


function normalizeImages(body) {
    let imgs = body?.images;
    if (!imgs && body?.image) imgs = [body.image];
    if (!imgs) return [];
    return Array.isArray(imgs) ? imgs.filter(Boolean) : [imgs].filter(Boolean);
}


exports.createProject = async (req, res) => {
    try {
        console.log("User from middleware:", req.user);
        console.log("User from middleware:", req.user);
        console.log("Body received:", req.body);
        console.log("Files received:", req.files);

        const normalizedBody = { ...req.body, image: normalizeImages(req.body) };
        const imageUploadPromises = Array.isArray(req.files)
            ? req.files.map((file) =>
                uploadToS3(file.buffer, file.originalname, file.mimetype)
            )
            : [];

        const imageUrls = await Promise.all(imageUploadPromises);
        normalizedBody.image = imageUrls;

        const project = await Project.create(normalizedBody);

        if (imageUrls.length) {
            const docs = imageUrls.map((img) => ({
                project: project._id,
                image: img,
            }));
            await gallery.insertMany(docs);
        }

        res.status(201).json({ success: true, data: project });
    } catch (err) {
        res.status(400).json({
            success: false,
            err: err.message,
            fields: err.errors ? Object.keys(err.errors) : null,
            details: err.errors || null,
        });
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

        // ✅ Normalize image URLs
        const formattedProjects = projects.map((project) => ({
            ...project.toObject(),
            image: Array.isArray(project.image)
                ? project.image.map((url) => encodeURI(url))
                : []
        }));

        res.status(200).json({
            success: true,
            count: formattedProjects.length,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            filters: { status, type },
            data: formattedProjects
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

        // ✅ Normalize image URLs
        const formatted = {
            ...project.toObject(),
            image: Array.isArray(project.image)
                ? project.image.map((url) => encodeURI(url))
                : []
        };

        res.status(200).json({ success: true, data: formatted });
    } catch (err) {
        res.status(500).json({ success: false, err: err.message });
    }
};


exports.updateProject = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const existing = await Project.findById(req.params.id).session(session);
        if (!existing) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, err: 'project not found' });
        }

        // ✅ Upload new images only if files are provided
        let imageUrls = [];
        if (req.files?.length) {
            imageUrls = await Promise.all(
                req.files.map((file) =>
                    uploadToS3(file.buffer, file.originalname, file.mimetype)
                )
            );
            req.body.image = imageUrls;
        }

        const imagesProvided = imageUrls.length > 0;

        // ✅ Delete old images from S3 only if new ones are provided
        if (imagesProvided && existing.image?.length) {
            for (const url of existing.image) {
                const key = extractKeyFromUrl(url);
                await s3.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key
                }));
            }
        }

        // ✅ Update project with new data
        const updated = await Project.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true, session }
        );

        // ✅ Sync gallery only if new images were uploaded
        if (imagesProvided) {
            await gallery.deleteMany({ project: updated._id }, { session });

            const images = normalizeImages(req.body);
            const docs = images
                .filter((img) => typeof img === 'string')
                .map((img) => ({
                    project: updated._id,
                    image: img
                }));

            if (docs.length) {
                await gallery.insertMany(docs, { session });
            }
        }

        await session.commitTransaction();
        res.status(200).json({ success: true, data: updated });
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

        const project = await Project.findById(req.params.id).session(session);
        if (!project) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, err: 'project not found' });
        }

        // Delete images from S3
        if (project.image?.length) {
            for (const url of project.image) {
                const key = extractKeyFromUrl(url);
                await s3.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key
                }));
            }
        }

        await gallery.deleteMany({ project: project._id }, { session });
        await project.deleteOne({ session });

        await session.commitTransaction();
        res.status(200).json({ success: true, data: project });
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ success: false, err: err.message });
    } finally {
        session.endSession();
    }
};
