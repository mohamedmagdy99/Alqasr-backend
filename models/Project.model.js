const mongoose = require("mongoose");

const multiLangStringSchema = new mongoose.Schema({
    en: { type: String, required: true },
    ar: { type: String, required: true }
}, { _id: false });

const multiLangArraySchema = new mongoose.Schema({
    en: [{ type: String }],
    ar: [{ type: String }]
}, { _id: false });

const projectSchema = new mongoose.Schema({
    title: { type: multiLangStringSchema, required: true },
    type: { type: String, required: true },
    description: { type: multiLangStringSchema, required: true },
    image: [{ type: String, required: true }],
    status: { type: multiLangStringSchema, required: true },
    location: { type: multiLangStringSchema, required: true },
    completionDate: { type: Date },
    features: { type: multiLangArraySchema, default: { en: [], ar: [] } },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    area: { type: Number },
    mainProject: { type: mongoose.Schema.Types.ObjectId, ref: "MainProject", required: true }
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
