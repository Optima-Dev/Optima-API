import express from "express";
import {
  getMe,
  updateMe,
  deleteMe,
  isAuthenticated,
} from "../controllers/userController.js";

const router = express.Router();

router.use(isAuthenticated);
router.route("/me").get(getMe).put(updateMe).delete(deleteMe);

export default router;
