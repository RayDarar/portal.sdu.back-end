import { Schema, model } from "mongoose";
import models from "@/models/names";

const Courses = new Schema({
  _id: Schema.ObjectId,
  code: {
    type: String,
    required: true,
    unique: true,
  },
  year: {
    type: Number,
    required: true,
  },
  language: {
    type: String,
    default: "en",
  },
  name: {
    en: String,
    kz: String,
    ru: String,
  },
  department: {
    type: Object,
    _id: Schema.ObjectId,
  },
  hours: {
    theory: Number,
    practice: Number,
    labs: Number,
  },
  credits: {
    type: Number,
    required: true,
  },
  ects: {
    type: Number,
    required: true,
  },
});

const CoursesModel = model(models.courses, Courses);

export default CoursesModel;