import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJwt from "../middlewares/auth.middleware.js";
import { getVendorOrders } from "../controllers/getVendororder.controller.js";

const router = Router();

router
  .route("/get-order-by-vendor-Id/:vendorId")
  .get(
    
    // verifyJwt(["vendor"]),
     upload().none(), getVendorOrders);

export default router;
