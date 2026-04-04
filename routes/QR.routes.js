import express from "express";
import {
  createQR,
  getAllQRs,
  getOneQR,
  updateQR,
  deleteQR,
} from "../controllers/QR.controller.js";

const router = express.Router();

router.post("/create", createQR);
router.get("/get-all", getAllQRs);
router.get("/get-one/:id", getOneQR);
router.put("/update/:id", updateQR);
router.delete("/delete/:id", deleteQR);

export default router;
