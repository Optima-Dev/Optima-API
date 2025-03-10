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

    filteredFriendRequests.push({
      _id: friendRequests[i]._id,
      seekerId: friendRequests[i].seekerId,
      firstName: seeker.firstName,
      lastName: seeker.lastName,
      email: seeker.email,
    });
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

  const user = await User.findById(seekerId);

  const isFriend = user.myPeople.find((person) => {
    return person.user.toString() === helperId.toString();
  });

  if (isFriend) {
    return next(new customError("Already a friend!", 400));
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

const removeFriend = asyncHandler(async (req, res, next) => {
  const { friendId } = req.body;

  if (!friendId) {
    return next(new customError("Please provide friend id!", 400));
  }

  const friend = await User.findById(friendId);

  if (!friend) {
    return next(new customError("Friend not found!", 404));
  }

  const user = req.user;

  user.myPeople = user.myPeople.filter((person) => {
    return person.user.toString() !== friendId;
  });

  friend.myPeople = friend.myPeople.filter((person) => {
    return person.user.toString() !== user._id.toString();
  });

  await user.save();
  await friend.save();

  res.status(200).json({ message: "Friend removed!" });
});

const editFriend = asyncHandler(async (req, res, next) => {
  const { friendId, customFirstName, customLastName } = req.body;

  if (!friendId) {
    return next(
      new customError("Please provide all the required fields!", 400)
    );
  }

  const friend = await User.findById(friendId);

  if (!friend) {
    return next(new customError("Friend not found!", 404));
  }

  const user = req.user;

  const friendIndex = user.myPeople.findIndex((person) => {
    return person.user.toString() === friendId;
  });

  if (friendIndex === -1) {
    return next(new customError("Friend not found!", 404));
  }

  customFirstName = customFirstName.trim();
  customLastName = customLastName.trim();

  customFirstName =
    customFirstName || user.myPeople[friendIndex].customFirstName;

  customLastName = customLastName || user.myPeople[friendIndex].customLastName;

  user.myPeople[friendIndex].customFirstName = customFirstName;
  user.myPeople[friendIndex].customLastName = customLastName;

  await user.save();

  res.status(200).json({ message: "Friend updated!" });
});

const getAllFriends = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .populate("myPeople.user", "firstName lastName email") // Add fields you want to include
    .exec();

  const originalMyPeople = user.myPeople;
  let notFoundFriends = [];

  // Filter out invalid references
  user.myPeople = user.myPeople.filter((person) => {
    if (!person.user) {
      notFoundFriends.push(person.user);
      return false;
    }
    return true;
  });

  // Save if any invalid references were found
  if (notFoundFriends.length > 0) {
    await user.save();
  }

  // Prepare response with populated data
  const friends = user.myPeople.map((person) => ({
    customFirstName: person.customFirstName,
    customLastName: person.customLastName,
    user: {
      _id: person.user._id,
      firstName: person.user.firstName,
      lastName: person.user.lastName,
      email: person.user.email,
    },
  }));

  res.status(200).json({ friends });
});

export {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getAllFriendRequests,
  removeFriend,
  editFriend,
  getAllFriends,
};
