import express from "express";
import { getFloatingVideoConfig, updateFloatingVideoConfig, deleteFloatingVideo } from "../controllers/FloatingVideo.controller.js";

const router = express.Router();

router.get("/get-config", getFloatingVideoConfig);
router.post("/update-config", updateFloatingVideoConfig);
router.delete("/delete-config", deleteFloatingVideo);

export default router;
