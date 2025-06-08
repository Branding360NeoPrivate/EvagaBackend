import verifyJwt from "../middlewares/auth.middleware.js";
import express from "express";
import {
  processImagePreview,
  uploadToS3WithEncoded,
} from "../middlewares/uploadWithEncode.middleware.js";
import { createGallery } from "../controllers/gallery.controller.js";
const router = express.Router();

router.route("/add-gallery").post(
//   verifyJwt(["admin"]),
  uploadToS3WithEncoded("gallery", [
    "image/png",
    "image/jpg",
    "image/jpeg",
    "image/webp",
  ]),
  processImagePreview,
  createGallery
);

export default router;
