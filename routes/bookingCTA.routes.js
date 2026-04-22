import express from "express";
import {
  createBooking,
  getBookings,
  downloadBookingsCSV,
  markAsRead,
} from "../controllers/bookingCTA.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

// Public routes
router.post("/bookings", upload().none(), createBooking);

// Admin routes (protect these in production)
router.get("/admin/bookings", upload().none(), getBookings);
router.get("/admin/bookings/export", upload().none(), downloadBookingsCSV);
router.put("/admin/bookings/:id/read", upload().none(), markAsRead);

export default router;
