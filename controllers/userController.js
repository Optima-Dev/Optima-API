import { generateToken, verifyToken } from "../utils/jwt.js";
import asyncHandler from "express-async-handler";
import customError from "../utils/customError.js";
import User from "../models/userModel.js";

const getMe = asyncHandler(async (req, res, next) => {});

const deleteMe = asyncHandler(async (req, res, next) => {});

const updateMe = asyncHandler(async (req, res, next) => {});

const isAuthenticated = asyncHandler(async (req, res, next) => {});

export { getMe, updateMe, deleteMe, isAuthenticated };
