import express from "express";
import {
  signup,
  login,
  google,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", google);

router.post("/forgotpassword", forgotPassword);
router.put("/resetpassword", resetPassword);

export default router;
