import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getAllFriendRequests,
  removeFriend,
  editFriend,
  getAllFriends,
} from "../controllers/friendController.js";

import {
  isAuthenticated,
  isAuthorized,
} from "../controllers/userController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Friend management endpoints
 */

/**
 * @swagger
 * /api/friends/requests:
 *   get:
 *     summary: Get all friend requests
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of friend requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "5f8d0d55b54764421b7156da"
 *                   seekerId:
 *                     type: string
 *                     example: "5f8d0d55b54764421b7156db"
 *                   firstName:
 *                     type: string
 *                     example: "John"
 *                   lastName:
 *                     type: string
 *                     example: "Doe"
 *                   email:
 *                     type: string
 *                     example: "user@example.com"
 */

/**
 * @swagger
 * /api/friends/all:
 *   get:
 *     summary: Get all friends with user details
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of friends with populated user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 friends:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       customFirstName:
 *                         type: string
 *                         example: "Bestie"
 *                       customLastName:
 *                         type: string
 *                         example: "Smith"
 *                       user:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "5f8d0d55b54764421b7156da"
 *                           firstName:
 *                             type: string
 *                             example: "John"
 *                           lastName:
 *                             type: string
 *                             example: "Doe"
 *                           email:
 *                             type: string
 *                             format: email
 *                             example: "john.doe@example.com"
 */

/**
 * @swagger
 * /api/friends/send:
 *   post:
 *     summary: Send friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customFirstName
 *               - customLastName
 *               - helperEmail
 *             properties:
 *               customFirstName:
 *                 type: string
 *                 example: John
 *               customLastName:
 *                 type: string
 *                 example: Doe
 *               helperEmail:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Friend request created
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Friend request sent
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Please provide all the required fields!
 *       404:
 *         description: Helper not found
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Helper not found!
 */

/**
 * @swagger
 * /api/friends/accept:
 *   post:
 *     summary: Accept friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - friendRequestId
 *             properties:
 *               friendRequestId:
 *                 type: string
 *                 example: 65f47a8cde3a6e7b5a1c9b91
 *     responses:
 *       200:
 *         description: Request accepted
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Friend request accepted
 *
 *       400:
 *         description: Invalid request ID
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Please provide friend request id!
 *       404:
 *         description: Request not found
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Friend request not found!
 */

/**
 * @swagger
 * /api/friends/reject:
 *   post:
 *     summary: Reject friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - friendRequestId
 *             properties:
 *               friendRequestId:
 *                 type: string
 *                 example: 65f47a8cde3a6e7b5a1c9b91
 *     responses:
 *       200:
 *         description: Request rejected
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Friend request rejected
 *       404:
 *         description: Request not found
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Friend request not found!
 */

/**
 * @swagger
 * /api/friends/remove:
 *   post:
 *     summary: Remove a friend
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - friendId
 *             properties:
 *               friendId:
 *                 type: string
 *                 example: 65f47a8cde3a6e7b5a1c9b91
 *     responses:
 *       200:
 *         description: Friend removed
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Friend removed!
 *       404:
 *         description: Friend not found
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Friend not found!
 */

/**
 * @swagger
 * /api/friends/edit:
 *   put:
 *     summary: Edit friend details
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - friendId
 *               - customFirstName
 *               - customLastName
 *             properties:
 *               friendId:
 *                 type: string
 *                 example: 65f47a8cde3a6e7b5a1c9b91
 *               customFirstName:
 *                 type: string
 *                 example: John
 *               customLastName:
 *                 type: string
 *                 example: Doe
 *     responses:
 *       200:
 *         description: Friend updated
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Friend updated!
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Please provide all the required fields!
 *       404:
 *         description: Friend not found
 *         content:
 *           application/json:
 *            schema:
 *             type: object
 *             properties:
 *               message:
 *                type: string
 *                example: Friend not found!
 */

router.use(isAuthenticated);

router.route("/send").post(isAuthorized("seeker"), sendFriendRequest);
router.route("/accept").post(isAuthorized("helper"), acceptFriendRequest);
router.route("/reject").post(isAuthorized("helper"), rejectFriendRequest);
router.route("/requests").get(isAuthorized("helper"), getAllFriendRequests);
router.route("/remove").post(removeFriend);
router.route("/edit").put(editFriend);
router.route("/all").get(getAllFriends);

export default router;
