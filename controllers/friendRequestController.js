import asyncHandler from "express-async-handler";
import customError from "../utils/customError.js";
import User from "../models/userModel.js";
import FriendRequest from "../models/friendRequestModel.js";

const getAllFriendRequests = asyncHandler(async (req, res, next) => {
  const helperId = req.user._id;

  const friendRequests = await FriendRequest.find({ helperId });

  let filteredFriendRequests = [];

  for (let i = 0; i < friendRequests.length; i++) {
    const seeker = await User.findById(friendRequests[i].seekerId);

    if (!seeker) {
      await FriendRequest.findByIdAndDelete(friendRequests[i]._id);
      continue;
    }

    filteredFriendRequests.push(friendRequests[i]);
  }

  res.status(200).json({ friendRequests: filteredFriendRequests });
});

const sendFriendRequest = asyncHandler(async (req, res, next) => {
  let { customFirstName, customLastName, helperEmail } = req.body;
  const seekerId = req.user._id;

  customFirstName = customFirstName.trim();
  customLastName = customLastName.trim();
  helperEmail = helperEmail.trim();

  if (!customFirstName || !customLastName || !helperEmail) {
    return next(
      new customError("Please provide all the required fields!", 400)
    );
  }

  const helper = await User.findOne({ email: helperEmail });

  if (!helper) {
    return next(new customError("Helper not found!", 404));
  }

  if (helper.role !== "helper") {
    return next(new customError("Helper not found!", 404));
  }

  const helperId = helper._id;

  const existingFriendRequest = await FriendRequest.findOne({
    seekerId,
    helperId,
  });

  if (existingFriendRequest) {
    return next(new customError("Friend request already sent!", 400));
  }

  const friendRequest = new FriendRequest({
    seekerId,
    helperId,
    customFirstName,
    customLastName,
  });

  await friendRequest.save();

  res.status(201).json({ friendRequest });
});

const acceptFriendRequest = asyncHandler(async (req, res, next) => {
  const { friendRequestId } = req.body;

  if (!friendRequestId) {
    return next(new customError("Please provide friend request id!", 400));
  }

  const friendRequest = await FriendRequest.findById(friendRequestId);

  if (!friendRequest) {
    return next(new customError("Friend request not found!", 404));
  }

  const seeker = await User.findById(friendRequest.seekerId);
  const helper = await User.findById(friendRequest.helperId);

  if (!seeker || !helper) {
    FriendRequest.findByIdAndDelete(friendRequestId);
    return next(new customError("User not found!", 404));
  }

  seeker.myPeople.push({
    customFirstName: friendRequest.customFirstName,
    customLastName: friendRequest.customLastName,
    user: helper._id,
  });

  helper.myPeople.push({
    customFirstName: seeker.firstName,
    customLastName: seeker.lastName,
    user: seeker._id,
  });

  await seeker.save();
  await helper.save();

  await FriendRequest.findByIdAndDelete(friendRequestId);

  res.status(200).json({ message: "Friend request accepted!" });
});

const rejectFriendRequest = asyncHandler(async (req, res, next) => {
  const { friendRequestId } = req.body;

  if (!friendRequestId) {
    return next(new customError("Please provide friend request id!", 400));
  }

  const friendRequest = await FriendRequest.findById(friendRequestId);

  if (!friendRequest) {
    return next(new customError("Friend request not found!", 404));
  }

  await FriendRequest.findByIdAndDelete(friendRequestId);

  res.status(200).json({ message: "Friend request rejected!" });
});

export {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getAllFriendRequests,
};
