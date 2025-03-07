import { generateToken, verifyToken } from "../utils/jwt.js";
import asyncHandler from "express-async-handler";
import customError from "../utils/customError.js";
import User from "../models/userModel.js";

const getMe = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(new customError("User not found!", 404));
  }

  const user = await User.findById(req.user._id).select(
    "_id firstName lastName email"
  );

  if (!user) {
    return next(new customError("User not found!", 404));
  }

  res.status(200).json({ user });
});

const deleteMe = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(new customError("User not found!", 404));
  }

  const user = await User.findByIdAndDelete(req.user._id);

  if (!user) {
    return next(new customError("User not found!", 404));
  }

  res.status(204).json({ message: "User deleted successfully" });
});

const updateMe = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(new customError("User not found!", 404));
  }

  if (req.body.password || req.body.newPassword) {
    return next(new customError("Password cannot be updated here!", 400));
  }

  const updated = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
  };

  if (!updated.firstName) {
    updated.firstName = req.user.firstName;
  }

  if (!updated.lastName) {
    updated.lastName = req.user.lastName;
  }

  if (!updated.email) {
    updated.email = req.user.email;
  } else {
    if (updated.email !== req.user.email) {
      const user = await User.findOne({ email: updated.email });
      if (user) {
        return next(new customError("Email already exists!", 400));
      }
    }
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updated, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    return next(new customError("User not found!", 404));
  }

  res.status(200).json({ user: updatedUser });
});

const isAuthenticated = asyncHandler(async (req, res, next) => {
  let token;

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

  const decoded = await verifyToken(token);

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

const isAuthorized = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new customError("You are not authorized to access this route.", 403)
      );
    }
    next();
  };
};

export { getMe, updateMe, deleteMe, isAuthenticated, isAuthorized };
