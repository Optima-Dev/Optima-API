import { generateToken, verifyToken } from "../utils/jwt.js";
import asyncHandler from "express-async-handler";
import customError from "../utils/customError.js";
import User from "../models/userModel.js";
import * as EmailValidator from "email-validator";
import sendEmail from "../utils/sendEmail.js";

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

const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new customError("Please provide an email", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new customError("User not found", 404));
  }

  const code = Math.floor(1000 + Math.random() * 9000);

  user.resetPasswordCode = code;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  await user.save();

  const options = {
    email,
    subject: "Password reset code",
    code,
  };

  try {
    await sendEmail(options);
    res.status(200).json({ message: "Email sent" });
  } catch (error) {
    user.resetPasswordCode = undefined;
    user.resetPasswordExpire = undefined;
    user.verifiedCode = false;
    await user.save();
    return next(new customError("Email could not be sent", 500));
  }
});

const verifyCode = asyncHandler(async (req, res, next) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return next(new customError("Please provide an email and code", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new customError("User not found", 404));
  }

  if (code !== user.resetPasswordCode) {
    return next(new customError("Invalid code", 400));
  }

  if (user.resetPasswordExpire < Date.now()) {
    user.resetPasswordCode = undefined;
    user.resetPasswordExpire = undefined;
    user.verifiedCode = false;
    await user.save();
    return next(new customError("Code expired", 400));
  }

  user.verifiedCode = true;
  await user.save();

  res.status(200).json({ message: "Code verified" });
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return next(new customError("Please provide an email and password", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new customError("User not found", 404));
  }

  if (!user.verifiedCode) {
    return next(new customError("Code not verified", 400));
  }

  user.password = newPassword;
  user.resetPasswordCode = undefined;
  user.resetPasswordExpire = undefined;
  user.verifiedCode = false;

  await user.save();

  res.status(200).json({ message: "Password reset successfully" });
});

export { signup, login, google, forgotPassword, verifyCode, resetPassword };
