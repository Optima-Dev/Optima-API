import { generateToken, verifyToken } from "../utils/jwt.js";
import asyncHandler from "express-async-handler";
import customError from "../utils/customError.js";
import User from "../models/userModel.js";

const getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id).select("-password -resetPasswordCode -resetPasswordExpire -verifiedCode -__v ");
    if (!user) {
        return next(new customError("User not found!", 404));
    }
    res.status(200).json({ user });
});

const deleteMe = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.user._id);
  if (!user) {
    return next(new customError("User not found!", 404));
  }
  res.status(204).json({ message: "User deleted successfully" });
});

const updateMe = asyncHandler(async (req, res, next) => {
  // 1) create error if user post password data
  if (req.body.password || req.body.confirmPassword) {
    return next(new customError("Password cannot be updated here!", 400));
  }

  // 2) filtered out unwanted and unallowed fields to be updated
  const filteredBody = filterObj(req.body, "name", "email");

  // update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

const isAuthenticated = asyncHandler(async (req, res, next) => {
  let token;
  // 1) get token from request header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new customError(
        "You are not logged in! Please log in to get access.",
        401
      )
    );
  }

  // 2) verify token
  const decoded = await verifyToken(token);
  console.log(decoded);

  // 3) check if user still exists
  const currentUser = await User.findById(decoded.userId);
  if (!currentUser) {
    return next(
      new customError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }
  req.user = currentUser;
  next();
});

export { getMe, updateMe, deleteMe, isAuthenticated };
