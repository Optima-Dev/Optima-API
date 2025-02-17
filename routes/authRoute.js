import express from "express";
import {
  signup,
  login,
  google,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user with email and password.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - role
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: MyStrongPassword123
 *               role:
 *                type: string
 *                example: seeker
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *               token:
 *                type: string
 *                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: User registered successfully
 *         content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *               message:
 *                type: string
 *                example: "Email already exist"
 *
 */

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", google);

router.post("/forgotpassword", forgotPassword);
router.put("/resetpassword", resetPassword);

export default router;
