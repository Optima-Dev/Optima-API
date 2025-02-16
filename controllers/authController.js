import { generateToken, verifyToken } from "../utils/jwt.js";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import customError from "../utils/customError.js";
import * as EmailValidator from "email-validator";

const signup = asyncHandler(async (req, res, next) => {
  let { firstName, lastName, email, password, role } = req.body;

  if (
    !email ||
    !password ||
    !firstName ||
    !lastName ||
    !role ||
    password.length < 6
  ) {
    return next(new customError("Please provide an email and password", 400));
  }

  email = email.trim();
  firstName = firstName.trim();
  lastName = lastName.trim();
  password = password.trim();

  if (!EmailValidator.validate(email)) {
    return next(new customError("Please provide a valid email", 400));
  }

  const existUser = await User.findOne({ email });

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

  const token = generateToken(user._id);

  res.status(201).json({ token });
});

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new customError("Please provide an email and password", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new customError("Invalid credentials", 401));
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return next(new customError("Invalid credentials", 401));
  }

  const token = generateToken(user._id);

  res.status(200).json({ token });
});

const google = asyncHandler(async (req, res, next) => {
  let { googleId, firstName, lastName, email, role } = req.body;

  if (!googleId || !email || !firstName || !lastName || !role) {
    return next(new customError("Please provide all fields", 400));
  }

  const existUser = await User.findOne({ email });

  if (existUser) {
    if (!existUser.googleId) {
      existUser.googleId = googleId;
      await existUser.save();
    }

    const token = generateToken(existUser._id);
    return res.status(200).json({ token });
  }

  const user = new User({
    googleId,
    firstName,
    lastName,
    email,
    role,
  });

  await user.save();

  const token = generateToken(user._id);

  res.status(201).json({ token });
});

const forgotPassword = asyncHandler(async (req, res, next) => {});

const resetPassword = asyncHandler(async (req, res, next) => {});

export { signup, login, google, forgotPassword, resetPassword };
