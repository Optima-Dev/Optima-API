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

  // Validate meeting type
  if (!type || !["global", "specific"].includes(type)) {
    return next(new customError("Invalid meeting type", 400));
  }

  // Check if seeker already has an active meeting
  const existingMeeting = await Meeting.findOne({
    seeker,
    status: { $in: ["pending", "accepted"] },
  });

  if (existingMeeting) {
    existingMeeting.status = "ended";
    existingMeeting.endedAt = Date.now();
    await existingMeeting.save();
  }

  let meeting;
  if (type === "specific") {
    if (!helper) {
      return next(
        new customError("Helper is required for specific meetings", 400)
      );
    }
    const user = await User.findById(helper);
    if (!user) {
      return next(new customError("Helper not found", 404));
    }
    if (user.role !== "helper") {
      return next(new customError("Specified user is not a helper", 400));
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
  if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {
    return next(
      new customError(
        "Twilio credentials are not configured correctly. Please contact support.",
        500
      )
    );
  }

  const { meetingId } = req.body;
  if (!meetingId) {
    return next(new customError("Meeting ID is required", 400));
  }

  const identity = req.user._id.toString();
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return next(new customError("Meeting not found", 404));
  }

  // Check if meeting has timed out waiting for helper
  if (meeting.status === "pending" && meeting.checkPendingTimeout()) {
    meeting.status = "timeout";
    await meeting.save();
    return next(
      new customError("Meeting has timed out waiting for helper", 400)
    );
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
  if (meeting.status === "ended" || meeting.status === "timeout") {
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

  // Validate meeting ID format
  if (!mongoose.Types.ObjectId.isValid(meetingId)) {
    return next(new customError("Invalid meeting ID format", 400));
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

  // Check if meeting has timed out
  if (meeting.checkPendingTimeout()) {
    meeting.status = "timeout";
    await meeting.save();
    return next(new customError("Meeting has timed out", 400));
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
  meeting.endedAt = Date.now();
  await meeting.save();

  res.status(200).json({
    status: "success",
    data: {
      meeting,
    },
  });
});

// Add a new function to check for timed out pending meetings
const checkPendingTimeouts = asyncHandler(async () => {
  const meetings = await Meeting.find({ status: "pending" });

  for (const meeting of meetings) {
    if (meeting.checkPendingTimeout()) {
      meeting.status = "timeout";
      await meeting.save();
    }
  }
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
  checkPendingTimeouts,
};
