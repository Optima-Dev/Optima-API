import jwt from "jsonwebtoken";
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

  res.status(201).json({ message: "User created successfully" });
});

export { signup };
