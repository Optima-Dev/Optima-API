import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import customError from "../utils/customError.js";

const signup = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, role } = req.body;

  const existUser = await User.findOne({ email });

  if (!email || !password) {
    return next(new customError("Please provide an email and password", 400));
  }

  if (existUser) {
    return next(new customError("User already exist", 400));
  }

  const user = new User({
    firstName,
    lastName,
    email,
    password,
    role,
  });

  await user.save();

  res.status(201).json({ message: "User created successfully" });
});

export { signup };
