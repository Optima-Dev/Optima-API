import express from "express";
const router = express.Router();

import {
  createMeeting,
  getMeeting,
  generateAccessToken,
  rejectMeeting,
  acceptSpecificMeeting,
  endMeeting,
  getPendingSpecificMeetings,
  acceptFirstMeeting,
  checkPendingTimeouts,
} from "../controllers/meetingController.js";

import {
  isAuthenticated,
  isAuthorized,
} from "../controllers/userController.js";

/**
 * @swagger
 * tags:
 *   name: Meetings
 *   description: Meeting management endpoints
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Meeting:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         seeker:
 *           type: string
 *           description: ID of the user who created the meeting
 *         type:
 *           type: string
 *           enum: [global, specific]
 *         helper:
 *           type: string
 *           description: ID of the helper (if type is specific)
 *         status:
 *           type: string
 *           enum: [pending, accepted, ended, rejected]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/meetings:
 *   post:
 *     summary: Create a new meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [global, specific]
 *                 description: Type of meeting (global for any helper, specific for a particular helper)
 *               helper:
 *                 type: string
 *                 description: Required if type is specific, the ID of the helper to join the meeting
 *     responses:
 *       201:
 *         description: Meeting created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     meeting:
 *                       $ref: '#/components/schemas/Meeting'
 *       400:
 *         description: Invalid input or helper not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/meetings/{id}:
 *   get:
 *     summary: Get meeting details
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Meeting details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     meeting:
 *                       $ref: '#/components/schemas/Meeting'
 *       404:
 *         description: Meeting not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/meetings/token:
 *   post:
 *     summary: Generate access token for joining a meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meetingId
 *             properties:
 *               meetingId:
 *                 type: string
 *                 description: ID of the meeting to join
 *     responses:
 *       200:
 *         description: Token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     roomName:
 *                       type: string
 *                     identity:
 *                       type: string
 *       400:
 *         description: Invalid meeting ID or meeting has ended
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not allowed to join this meeting
 */

/**
 * @swagger
 * /api/meetings/reject:
 *   post:
 *     summary: Reject a specific meeting request
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meetingId
 *             properties:
 *               meetingId:
 *                 type: string
 *                 description: ID of the meeting to reject
 *     responses:
 *       200:
 *         description: Meeting rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     meeting:
 *                       $ref: '#/components/schemas/Meeting'
 *       400:
 *         description: Invalid meeting ID or meeting already rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not allowed to reject this meeting
 */

/**
 * @swagger
 * /api/meetings/accept-specific:
 *   post:
 *     summary: Accept a specific meeting request
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meetingId
 *             properties:
 *               meetingId:
 *                 type: string
 *                 description: ID of the specific meeting to accept
 *     responses:
 *       200:
 *         description: Meeting accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     meeting:
 *                       $ref: '#/components/schemas/Meeting'
 *       400:
 *         description: Invalid meeting ID or meeting already accepted
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/meetings/accept-first:
 *   post:
 *     summary: Accept the first available global meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Meeting accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     meeting:
 *                       $ref: '#/components/schemas/Meeting'
 *       404:
 *         description: No pending meetings available
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/meetings/pending-specific:
 *   get:
 *     summary: Get all pending specific meetings for the current helper
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending specific meetings with seeker names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     meetings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           seeker:
 *                             type: string
 *                             description: ID of the seeker
 *                           seekerName:
 *                             type: string
 *                             description: Full name of the seeker (customFirstName + customLastName)
 *                           type:
 *                             type: string
 *                             enum: [global, specific]
 *                           helper:
 *                             type: string
 *                             description: ID of the helper
 *                           status:
 *                             type: string
 *                             enum: [pending, accepted, ended, rejected]
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/meetings/end:
 *   post:
 *     summary: End an ongoing meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meetingId
 *             properties:
 *               meetingId:
 *                 type: string
 *                 description: ID of the meeting to end
 *     responses:
 *       200:
 *         description: Meeting ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     meeting:
 *                       $ref: '#/components/schemas/Meeting'
 *       400:
 *         description: Invalid meeting ID or meeting not accepted
 *       401:
 *         description: Unauthorized
 */

// Base middleware for all routes
router.use(isAuthenticated);

// Create a new meeting (seeker only)
router.post("/", isAuthorized("seeker"), createMeeting);

// Generate token for joining a meeting
router.post("/token", generateAccessToken);

// Helper routes
router.post("/reject", isAuthorized("helper"), rejectMeeting);
router.post("/accept-specific", isAuthorized("helper"), acceptSpecificMeeting);
router.post("/accept-first", isAuthorized("helper"), acceptFirstMeeting);
router.get(
  "/pending-specific",
  isAuthorized("helper"),
  getPendingSpecificMeetings
);

// Common routes (both seeker and helper)
router.post("/end", endMeeting);

// Get a specific meeting (must be last to prevent conflicts with other routes)
router.get("/:id", getMeeting);

// Check for timed out pending meetings
router.post("/check-pending-timeouts", checkPendingTimeouts);

export default router;
