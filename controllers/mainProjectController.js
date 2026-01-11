const mongoose = require("mongoose");
const mainProject = require("../models/mainProjects.model");
const gallery = require("../models/Gallery.model");
const { uploadToS3 } = require("../utils/s3Uploader");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../utils/s3Client");
const extractKeyFromUrl = (url) => url.split("/").slice(3).join("/");

exports.createMainProject = async (req, res) => {
  try {
    const imageFile = req.files?.image || [];
    if (!imageFile) {
      return res.status(400).json({
        success: false,
        err: "Project must include at least one image",
        fields: ["image"],
      });
    }
    const uploadedImages = await Promise.all(
      imageFile.map((file) =>
        uploadToS3(file.buffer, file.originalname, file.mimetype)
      )
    );
    const projectData = {
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      image: uploadedImages,
      type: req.body.type,
      state: req.body.state ? req.body.state : "available",
    };
    const project = await mainProject.create(projectData);
    const galleryDocs = uploadedImages.map((img) => ({
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
exports.getAllMainProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, state, type } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};
    if (state) filter["state"] = state;
    if (type) filter["type"] = type;
    const projects = await mainProject
      .find(filter)
      .skip(skip)
      .limit(parseInt(limit));
    const total = await mainProject.countDocuments(filter);
    const formattedProjects = projects.map((project) => ({
      ...project.toObject(),
      image: Array.isArray(project.image)
        ? project.image.map((url) => encodeURI(url))
        : [],
    }));
    res.status(200).json({
      success: true,
      count: formattedProjects.length,
      data: formattedProjects,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      err: err.message,
      details: err.errors || null,
    });
  }
};
exports.getMainProjectById = async (req, res) => {
  try {
    const project = await mainProject.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        err: "Main project not found",
      });
    }
    const formatted = {
      ...project.toObject(),
      image: Array.isArray(project.image)
        ? project.image.map((url) => encodeURI(url))
        : [],
    };
    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    res.status(400).json({
      success: false,
      err: err.message,
      details: err.errors || null,
    });
  }
};
exports.updateMainProject = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const exisitingMainProject = await mainProject
      .findById(req.params.id)
      .session(session);

    if (!exisitingMainProject) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, err: "Main Project not found" });
    }

    // --- Handle Image Deletion ---
    let removedImages = [];
    if (req.body.removedImages) {
      removedImages = Array.isArray(req.body.removedImages)
        ? req.body.removedImages
        : [req.body.removedImages];
    }

    if (removedImages.length) {
      for (const url of removedImages) {
        const key = extractKeyFromUrl(url);
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
          })
        );

        // Fixed: changed existingProject to exisitingMainProject
        await gallery
          .deleteOne({ project: exisitingMainProject._id, image: url })
          .session(session);
      }
    }

    // --- Handle New Image Uploads ---
    let newImages = [];
    if (req.files && req.files.image) {
      const files = Array.isArray(req.files.image)
        ? req.files.image
        : [req.files.image];
      newImages = await Promise.all(
        files.map((file) =>
          uploadToS3(file.buffer, file.originalname, file.mimetype)
        )
      );
    }

    if (newImages.length) {
      const galleryDocs = newImages.map((img) => ({
        project: exisitingMainProject._id,
        image: img,
      }));
      await gallery.insertMany(galleryDocs, { session });
    }

    // Combine remaining old images and new images
    const finalImages = [
      ...(exisitingMainProject.image || []).filter(
        (img) => !removedImages.includes(img)
      ),
      ...newImages,
    ];

    if (!finalImages.length) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({
          success: false,
          err: "Project must include at least one image",
        });
    }

    // --- Construct Updated Data ---
    // Since FormData sends flat keys, we map them back to the object structure
    const updatedData = {
      title: {
        en: req.body.title_en || exisitingMainProject.title.en,
        ar: req.body.title_ar || exisitingMainProject.title.ar,
      },
      description: {
        en: req.body.description_en || exisitingMainProject.description.en,
        ar: req.body.description_ar || exisitingMainProject.description.ar,
      },
      location: {
        en: req.body.location_en || exisitingMainProject.location.en,
        ar: req.body.location_ar || exisitingMainProject.location.ar,
      },
      type: req.body.type || exisitingMainProject.type,
      image: finalImages,
      state: req.body.state || exisitingMainProject.state,
    };

    const updatedMainProject = await mainProject.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true, session }
    );

    await session.commitTransaction();
    res.status(200).json({ success: true, data: updatedMainProject });
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    res.status(500).json({ success: false, err: err.message });
  } finally {
    session.endSession();
  }
};
exports.deleteMainProject = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const existingMainProject = await mainProject
      .findById(req.params.id)
      .session(session);

    if (!existingMainProject) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, err: "Main Project not found" });
    }

    // 🗑 Delete images from S3
    if (existingMainProject.image?.length) {
      for (const url of existingMainProject.image) {
        const key = extractKeyFromUrl(url);
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
          })
        );
      }
    }

    // 🗑 Delete gallery images
    await gallery.deleteMany({ project: existingMainProject._id }, { session });

    // 🗑 Delete main project
    await existingMainProject.deleteOne({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: existingMainProject,
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, err: err.message });
  } finally {
    session.endSession();
  }
};
