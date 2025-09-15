const mongoose = require('mongoose');
const Project = require('../models/Project.model');
const gallery = require('../models/Gallery.model');
const { uploadToS3 } = require('../utils/s3Uploader');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../utils/s3Client'); // your configured S3Client
const extractKeyFromUrl = (url) => url.split('/').slice(3).join('/');

exports.createProject = async (req, res) => {
    try {
        // 1️⃣ Get all uploaded images
        const imageFiles = req.files.image || [];
        if (!imageFiles.length) {
            return res.status(400).json({
                success: false,
                err: 'Project must include at least one image',
                fields: ['image'],
            });
        }

        // 2️⃣ Upload all images to S3
        const uploadedImages = await Promise.all(
            imageFiles.map(file =>
                uploadToS3(file.buffer, file.originalname, file.mimetype)
            )
        );

        // 3️⃣ Create project (Project.image is an array)
        const projectData = {
            ...req.body,
            image: uploadedImages, // array of all uploaded images
        };
        const project = await Project.create(projectData);

        // 4️⃣ Insert all images into gallery collection
        const galleryDocs = uploadedImages.map(img => ({
            project: project._id,
            image: img,
        }));
        await gallery.insertMany(galleryDocs);

        // 5️⃣ Respond
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

        const project = await Project.findById(req.params.id).session(session);
        if (!project) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, err: "Project not found" });
        }

        // Parse removedImages
        let removedImages = [];
        if (req.body.removedImages) {
            removedImages = Array.isArray(req.body.removedImages)
                ? req.body.removedImages
                : [req.body.removedImages];
        }

        // 1️⃣ Remove images from S3 and Gallery table
        if (removedImages.length) {
            for (const url of removedImages) {
                const key = extractKeyFromUrl(url);
                await s3.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key
                }));

                // Remove from Gallery table
                await gallery.deleteOne({ project: project._id, image: url }).session(session);
            }
        }

        // 2️⃣ Upload new images
        // 2️⃣ Upload new images
        let newImages = [];
        if (req.files && req.files.image?.length) {
            newImages = await Promise.all(
                req.files.image.map(file =>
                    uploadToS3(file.buffer, file.originalname, file.mimetype)
                )
            );
        }
        // Insert new images to Gallery table
        if (newImages.length) {
            const newDocs = newImages.map(img => ({
                project: project._id,
                image: img
            }));
            await gallery.insertMany(newDocs, { session });
        }
        let finalImages = [];

        if (Array.isArray(project.image)) {
            const remainingImages = project.image.filter(img => !removedImages.includes(img));
            finalImages = [...remainingImages, ...newImages];
        } else {
            // Single image case
            finalImages = newImages.length
                ? newImages // overwrite with new
                : (removedImages.includes(project.image) ? [] : [project.image]);
        }

        // 4️⃣ Update other fields only
        const { images, removedImages: __, image: ___, ...otherFields } = req.body;
        const updatedData = {
            ...otherFields,
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
