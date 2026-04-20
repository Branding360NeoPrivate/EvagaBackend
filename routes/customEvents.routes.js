import express from "express";
import verifyJwt from "../middlewares/auth.middleware.js";
import {
  processImagePreview,
  uploadToS3WithEncoded,
  uploadMultipleToS3WithEncoded,
  processMultipleImagePreviews,
} from "../middlewares/uploadWithEncode.middleware.js";
import {
  createCustomEvent,
  getAllCustomEvents,
  getCustomEventById,
  updateCustomEvent,
  toggleActiveStatus,
  deleteCustomEvent,
  getCustomEventsByType,
  getPublicEventById,
  getPublicEventsByTierType,
} from "../controllers/customEvents.controller.js";

const router = express.Router();

// ===== PUBLIC ACCESS ROUTES =====
router.get("/public/tier/:tierType", getPublicEventsByTierType);
router.get("/public/:id", getPublicEventById);

// ===== ADMIN ROUTES =====
router.post(
  "/",
  verifyJwt(["admin"]),
  uploadMultipleToS3WithEncoded("customEvents", [
    "image/png",
    "image/jpg",
    "image/jpeg",
    "image/webp",
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/webm"
  ]),
  processMultipleImagePreviews,
  createCustomEvent
);

router.put("/:id", 
  verifyJwt(["admin"]), 
  uploadMultipleToS3WithEncoded("customEvents", [
    "image/png",
    "image/jpg",
    "image/jpeg",
    "image/webp",
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/webm"
  ]),
  processMultipleImagePreviews,
  updateCustomEvent
);
router.patch("/:id/toggle-active", verifyJwt(["admin"]), toggleActiveStatus);
router.delete("/:id", verifyJwt(["admin"]), deleteCustomEvent);

// ===== SHARED ROUTES =====
router.get("/", verifyJwt(["user", "admin"]), getAllCustomEvents);
router.get("/type/:eventType", verifyJwt(["user", "admin"]), getCustomEventsByType);
router.get("/:id", verifyJwt(["user", "admin"]), getCustomEventById);

export default router;