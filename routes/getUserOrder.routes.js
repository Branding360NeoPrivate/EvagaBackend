import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";

import {
  getSingleOrderItem,
  getUserOrder,
} from "../controllers/getUserOrder.controller.js";
import verifyJwt from "../middlewares/auth.middleware.js";

const router = Router();

router
  .route("/get-order-by-user-Id/:userId")
  .get(verifyJwt(["user"]), upload().none(), getUserOrder);
router
  .route("/get-one-order-by-order-Id/:orderId/:itemId")
  .get(verifyJwt(["user"]), upload().none(), getSingleOrderItem);

export default router;
