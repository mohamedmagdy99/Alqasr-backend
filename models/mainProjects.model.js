const mongoose = require("mongoose");

const multiLangStringSchema = new mongoose.Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  { _id: false }
);
const mainProjectSchema = new mongoose.Schema(
  {
    title: { type: multiLangStringSchema, required: true },
    description: { type: multiLangStringSchema, required: true },
    type: { type: String, enum: ["Residential", "Commercial"], required: true },
    image: { type: [String], required: true },
    location: { type: multiLangStringSchema, required: true },
    state: { type: String, enum: ["available", "sold"], default: "available" },
  },
  { timestamps: true }
);
module.exports = mongoose.model("MainProject", mainProjectSchema);
