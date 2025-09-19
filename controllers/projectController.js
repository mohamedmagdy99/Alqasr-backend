const mongoose = require('mongoose');
const Project = require('../models/Project.model');
const gallery = require('../models/Gallery.model');
const { uploadToS3 } = require('../utils/s3Uploader');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../utils/s3Client'); // your configured S3Client
const extractKeyFromUrl = (url) => url.split('/').slice(3).join('/');

exports.createProject = async (req, res) => {
    try {
        const imageFiles = req.files.image || [];
        if (!imageFiles.length) {
            return res.status(400).json({
                success: false,
                err: 'Project must include at least one image',
                fields: ['image'],
            });
        }

        const uploadedImages = await Promise.all(
            imageFiles.map(file =>
                uploadToS3(file.buffer, file.originalname, file.mimetype)
            )
        );

        const projectData = {
            title: req.body.title,
            type: req.body.type,
            description: req.body.description,
            image: uploadedImages,
            status: req.body.status,
            location: req.body.location,
            features: req.body.features,
        };

        // Handle completionDate if provided
        if (req.body.completionDate) {
            projectData.completionDate = new Date(req.body.completionDate);
        }

        const project = await Project.create(projectData);

        // Insert images into gallery collection
        const galleryDocs = uploadedImages.map(img => ({
            project: project._id,
            image: img,
        }));
        await gallery.insertMany(galleryDocs);

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
        if (status) filter['status.en'] = status;
        if (type) filter.type = type;

        const total = await Project.countDocuments(filter);
        const projects = await Project.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const formattedProjects = projects.map((project) => ({
            ...project.toObject(),
            image: Array.isArray(project.image)
                ? project.image.map((url) => encodeURI(url))
                : []
        }));

        res.status(200).json({
            success: true,
            count: formattedProjects.length,
            total,
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
        console.log("REQ BODY:", req.body);
        const existingProject = await Project.findById(req.params.id).session(session);
        if (!existingProject) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, err: "Project not found" });
        }

        // -----------------------------
        // Handle removed images
        // -----------------------------
        let removedImages = [];
        if (req.body.removedImages) {
            removedImages = Array.isArray(req.body.removedImages)
                ? req.body.removedImages
                : [req.body.removedImages];
        }

        if (removedImages.length) {
            for (const url of removedImages) {
                const key = extractKeyFromUrl(url);
                await s3.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key,
                }));

                await gallery.deleteOne({ project: existingProject._id, image: url }).session(session);
            }
        }

        // -----------------------------
        // Handle new uploaded images
        // -----------------------------
        let newImages = [];
        if (req.files && req.files.image?.length) {
            newImages = await Promise.all(
                req.files.image.map(file =>
                    uploadToS3(file.buffer, file.originalname, file.mimetype)
                )
            );
        }

        if (newImages.length) {
            const galleryDocs = newImages.map(img => ({
                project: existingProject._id,
                image: img,
            }));
            await gallery.insertMany(galleryDocs, { session });
        }

        // -----------------------------
        // Compute final images array
        // -----------------------------
        const finalImages = [
            ...(existingProject.image || []).filter(img => !removedImages.includes(img)),
            ...newImages,
        ];

        if (!finalImages.length) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, err: "Project must include at least one image" });
        }

        // -----------------------------
        // Parse multi-language fields
        // -----------------------------
        const updatedData = {
            title: {
                en: req.body.title_en,
                ar: req.body.title_ar,
            },
            description: {
                en: req.body.description_en,
                ar: req.body.description_ar,
            },
            location: {
                en: req.body.location_en,
                ar: req.body.location_ar,
            },
            status: {
                en: req.body.status_en,
                ar: req.body.status_ar,
            },
            type: req.body.type || existingProject.type,
            features: {
                en: Array.isArray(req.body.features_en) ? req.body.features_en : [],
                ar: Array.isArray(req.body.features_ar) ? req.body.features_ar : [],
            },
            completionDate: req.body.completionDate || existingProject.completionDate,
            image: finalImages,
        };
        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            updatedData,
            { new: true, runValidators: true, session }
        );

        await session.commitTransaction();
        res.status(200).json({ success: true, data: updatedProject });

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