import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getAllFriendRequests,
} from "../controllers/friendRequestController.js";

import {
  isAuthenticated,
  isAuthorized,
} from "../controllers/userController.js";

const router = express.Router();

router.use(isAuthenticated);

router.route("/send").post(isAuthorized("seeker"), sendFriendRequest);
router.route("/accept").post(isAuthorized("helper"), acceptFriendRequest);
router.route("/reject").post(isAuthorized("helper"), rejectFriendRequest);
router.route("/").get(isAuthorized("helper"), getAllFriendRequests);

export default router;
