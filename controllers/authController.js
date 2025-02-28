import { generateToken, verifyToken } from "../utils/jwt.js";
import asyncHandler from "express-async-handler";
import customError from "../utils/customError.js";
import User from "../models/userModel.js";
import * as EmailValidator from "email-validator";
import sendEmail from "../utils/sendEmail.js";

const signup = asyncHandler(async (req, res, next) => {
  let { firstName, lastName, email, password, role } = req.body;

  email = email.trim();
  firstName = firstName.trim();
  lastName = lastName.trim();
  password = password.trim();
  role = role.trim();

  if (!email || !password || !firstName || !lastName || !role) {
    return next(new customError("Please provide an email and password", 400));
  }

  if (password.length < 6) {
    return next(new customError("Password must be at least 6 characters", 400));
  }

  if (firstName.length < 2 || lastName.length < 2) {
    return next(
      new customError(
        "First name and last name must be at least 2 characters",
        400
      )
    );
  }

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
  let { email, password, role } = req.body;

  password = password.trim();
  email = email.trim();
  role = role.trim();

  if (!email || !password) {
    return next(new customError("Please provide an email and password", 400));
  }

  if (!EmailValidator.validate(email)) {
    return next(new customError("Please provide a valid email", 400));
  }

  if (!role) {
    return next(new customError("Please provide a role", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new customError("Invalid credentials", 401));
  }

  if (user.role !== role) {
    return next(new customError("Invalid credentials", 401));
  }

  if (!user.password) {
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

  googleId = googleId.trim();
  email = email.trim();
  firstName = firstName.trim();
  lastName = lastName.trim();
  role = role.trim();

  if (!googleId || !email || !firstName || !lastName || !role) {
    return next(new customError("Please provide all fields", 400));
  }

  const existUser = await User.findOne({ email });

  if (existUser) {
    if (existUser.role !== role) {
      return next(new customError("Invalid credentials", 401));
    }

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

const sendCode = asyncHandler(async (req, res, next) => {
  let { email } = req.body;

  email = email.trim();

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
    res.status(200).json({ message: "Code sent successfully" });
  } catch (error) {
    user.resetPasswordCode = undefined;
    user.resetPasswordExpire = undefined;
    user.verifiedCode = false;
    await user.save();
    return next(new customError("Code could not be sent", 500));
  }
});

const verifyCode = asyncHandler(async (req, res, next) => {
  let { email, code } = req.body;

  email = email.trim();
  code = code.trim();

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
  let { email, newPassword } = req.body;

  email = email.trim();
  newPassword = newPassword.trim();

  if (!email || !newPassword) {
    return next(
      new customError("Please provide an email and newPassword", 400)
    );
  }

  if (newPassword.length < 6) {
    return next(new customError("Password must be at least 6 characters", 400));
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

export { signup, login, google, sendCode, verifyCode, resetPassword };
