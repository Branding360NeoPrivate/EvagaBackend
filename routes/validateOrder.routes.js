import { Router } from "express";
import { validateOrder } from "../controllers/validateOrder.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJwt from "../middlewares/auth.middleware.js";

const router = Router();

router
  .route("/validate-order")
  .post(verifyJwt(["user"]), upload().none(), validateOrder);

export default router;
