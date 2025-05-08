import User from "../models/userModel.js";
import Meeting from "../models/meetingModel.js";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import customError from "../utils/customError.js";
import twilio from "twilio";

const AccessToken = twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKey = process.env.TWILIO_API_KEY;
const twilioApiSecret = process.env.TWILIO_API_SECRET;

const createMeeting = asyncHandler(async (req, res, next) => {
  const { type, helper } = req.body;
  const seeker = req.user._id;
  if (!type) {
    return next(new customError("Type is required", 400));
  }

  let meeting;
  if (type === "specific") {
    if (!helper) {
      return next(new customError("Helper is required", 400));
    }
    const user = await User.findById(helper);
    if (!user) {
      return next(new customError("User not found", 404));
    }
    if (user._id.toString() === seeker.toString()) {
      return next(new customError("You cannot help yourself", 400));
    }
    meeting = new Meeting({
      seeker,
      type,
      helper,
    });
  } else {
    meeting = new Meeting({
      seeker,
      type,
    });
  }

  await meeting.save();
  res.status(201).json({
    status: "success",
    data: {
      meeting,
    },
  });
});

const getMeeting = asyncHandler(async (req, res, next) => {
  const meetingId = req.params.id;
  if (!meetingId) {
    return next(new customError("Meeting ID is required", 400));
  }
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return next(new customError("Meeting not found", 404));
  }

  // Check if the current user is either the seeker or helper of this meeting
  const userId = req.user._id.toString();
  if (
    userId !== meeting.seeker.toString() &&
    meeting.type === "specific" &&
    userId !== meeting.helper.toString()
  ) {
    return next(
      new customError("You are not authorized to access this meeting", 403)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      meeting,
    },
  });
});

const getPendingSpecificMeetings = asyncHandler(async (req, res, next) => {
  const helperId = req.user._id;
  const meetings = await Meeting.find({
    helper: helperId,
    status: "pending",
  });

  const helper = await User.findById(helperId);

  const editedMeetings = [];

  meetings.forEach((meeting) => {
    const seeker = helper.myPeople.find(
      (person) => person.user.toString() === meeting.seeker.toString()
    );
    editedMeetings.push({
      ...meeting,
      seekerName: seeker.customFirstName + " " + seeker.customLastName,
    });
  });

  res.status(200).json({
    status: "success",
    data: {
      meetings: editedMeetings,
    },
  });
});

const generateAccessToken = asyncHandler(async (req, res, next) => {
  const { meetingId } = req.body;
  if (!meetingId) {
    return next(new customError("Meeting ID is required", 400));
  }

  const identity = req.user._id.toString();
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return next(new customError("Meeting not found", 404));
  }

  // Check if user is authorized to join the meeting
  const isSeeker = identity === meeting.seeker.toString();
  const isHelper =
    meeting.type === "specific" && identity === meeting.helper.toString();
  const isGlobalHelper =
    meeting.type === "global" && meeting.status === "pending";

  if (!isSeeker && !isHelper && !isGlobalHelper) {
    return next(
      new customError("You are not allowed to join this meeting", 403)
    );
  }

  // Check meeting status
  if (meeting.status === "ended") {
    return next(new customError("Meeting has ended", 400));
  }
  if (meeting.status === "rejected") {
    return next(new customError("Meeting has been rejected", 400));
  }
  if (meeting.type === "global" && meeting.status !== "pending") {
    return next(new customError("Meeting is no longer available", 400));
  }

  // Generate token
  const accessToken = new AccessToken(
    twilioAccountSid,
    twilioApiKey,
    twilioApiSecret,
    { identity }
  );

  const roomName = meetingId;
  const videoGrant = new VideoGrant({ room: roomName });
  accessToken.addGrant(videoGrant);

  res.status(200).json({
    status: "success",
    data: {
      token: accessToken.toJwt(),
      roomName,
      identity,
    },
  });
});

const rejectMeeting = asyncHandler(async (req, res, next) => {
  const { meetingId } = req.body;
  if (!meetingId) {
    return next(new customError("Meeting ID is required", 400));
  }

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return next(new customError("Meeting not found", 404));
  }

  if (meeting.type !== "specific") {
    return next(new customError("Meeting is not specific", 400));
  }

  if (meeting.helper.toString() !== req.user._id.toString()) {
    return next(
      new customError("You are not allowed to reject this meeting", 403)
    );
  }

  if (meeting.status !== "pending") {
    return next(new customError("Meeting has already been rejected", 400));
  }

  meeting.status = "rejected";
  await meeting.save();

  res.status(200).json({
    status: "success",
    data: {
      meeting,
    },
  });
});

const acceptFirstMeeting = asyncHandler(async (req, res, next) => {
  const meetings = await Meeting.find({
    status: "pending",
    type: "global",
  }).sort({ createdAt: 1 });
  if (meetings.length === 0) {
    return next(new customError("No pending meetings", 404));
  }
  const meeting = meetings[0];
  meeting.status = "accepted";
  await meeting.save();

  res.status(200).json({
    status: "success",
    data: { meeting },
  });
});

const acceptSpecificMeeting = asyncHandler(async (req, res, next) => {
  const { meetingId } = req.body;
  if (!meetingId) {
    return next(new customError("Meeting ID is required", 400));
  }
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return next(new customError("Meeting not found", 404));
  }

  // Check if the current user is the helper of this meeting
  if (meeting.helper.toString() !== req.user._id.toString()) {
    return next(
      new customError("You are not authorized to accept this meeting", 403)
    );
  }

  // Check if the current user is in another meeting with status accepted
  const currentUser = req.user._id.toString();
  const existingMeeting = await Meeting.findOne({
    helper: currentUser,
    status: "accepted",
  });

  if (existingMeeting) {
    return next(new customError("You are already in another meeting", 400));
  }

  if (meeting.status !== "pending") {
    return next(new customError("Meeting has already been accepted", 400));
  }

  meeting.status = "accepted";
  await meeting.save();

  res.status(200).json({
    status: "success",
    data: {
      meeting,
    },
  });
});

const endMeeting = asyncHandler(async (req, res, next) => {
  const { meetingId } = req.body;
  if (!meetingId) {
    return next(new customError("Meeting ID is required", 400));
  }
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return next(new customError("Meeting not found", 404));
  }
  if (meeting.status !== "accepted") {
    return next(new customError("Meeting has not been accepted", 400));
  }
  meeting.status = "ended";
  await meeting.save();

  res.status(200).json({
    status: "success",
    data: {
      meeting,
    },
  });
});

export {
  createMeeting,
  getMeeting,
  generateAccessToken,
  rejectMeeting,
  acceptSpecificMeeting,
  endMeeting,
  getPendingSpecificMeetings,
  acceptFirstMeeting,
};
