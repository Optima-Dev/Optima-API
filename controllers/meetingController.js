import User from "../models/userModel.js";
import Meeting from "../models/meetingModel.js";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import customError from "../utils/customError.js";
import twilio from "twilio";
import { RtcTokenBuilder } from "agora-access-token";
import { CallPage } from "twilio/lib/rest/api/v2010/account/call.js";

const AccessToken = twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKey = process.env.TWILIO_API_KEY;
const twilioApiSecret = process.env.TWILIO_API_SECRET;

const agoraAppId = process.env.AGORA_APP_ID;
const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE;

const generateTokenForMeeting = asyncHandler(async (identity, meetingId) => {
  if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {
    throw new customError("Twilio credentials are not set", 500);
  }

  if (!identity || !meetingId) {
    throw new customError("Identity and meeting ID are required", 400);
  }

  const client = twilio(twilioApiKey, twilioApiSecret, {
    accountSid: twilioAccountSid,
  });

  // if the room is not created, create it
  try {
    await client.video.v1.rooms(meetingId).fetch();
  } catch (error) {
    await client.video.v1.rooms.create({
      uniqueName: meetingId,
      emptyRoomTimeout: 2,
      unusedRoomTimeout: 1,
      maxParticipants: 2,
    });
  }

  // Generate token
  const accessToken = new AccessToken(
    twilioAccountSid,
    twilioApiKey,
    twilioApiSecret,
    { identity }
  );
  const videoGrant = new VideoGrant({
    room: meetingId,
  });

  accessToken.addGrant(videoGrant);
  return accessToken.toJwt();
});

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
  const token = await generateTokenForMeeting(seeker.toString(), meeting._id);

  res.status(201).json({
    status: "success",
    data: {
      token,
      roomName: meeting._id,
      identity: seeker.toString(),
    },
  });
});

const createMeetingAgora = asyncHandler(async (req, res, next) => {
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

  // Generate Agora token
  const role = 1; // 1 for publisher, 2 for subscriber
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    agoraAppId,
    agoraAppCertificate,
    meeting._id.toString(), // Channel name (use meeting ID as channel name)
    seeker.toString(), // User ID
    role,
    privilegeExpiredTs
  );

  console.log(`Agora channel created: ${meeting._id.toString()}`);

  res.status(201).json({
    status: "success",
    data: {
      token,
      channelName: meeting._id.toString(), // Agora uses channelName, not roomName
      uid: seeker.toString(), // Agora uses uid, not identity
      appId: agoraAppId, // Frontend needs this
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
  if (req.user.role !== "helper") {
    return next(
      new customError("You are not authorized to accept meetings", 403)
    );
  }

  const helper = await User.findById(req.user._id);
  if (!helper) {
    return next(new customError("Helper not found", 404));
  }

  const helperId = req.user._id;

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

  const token = await generateTokenForMeeting(helperId.toString(), meeting._id);

  res.status(200).json({
    status: "success",
    data: {
      token,
      roomName: meeting._id,
      identity: helperId.toString(),
    },
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

  const helperId = req.user._id;
  const token = await generateTokenForMeeting(helperId.toString(), meeting._id);

  res.status(200).json({
    status: "success",
    data: {
      token,
      roomName: meeting._id,
      identity: helperId.toString(),
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

const getGlobalMeetings = asyncHandler(async (req, res, next) => {
  const meetings = await Meeting.find({
    type: "global",
    status: "pending",
  });

  res.status(200).json({
    status: "success",
    data: {
      meetings,
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

const acceptMeetingAgora = asyncHandler(async (req, res, next) => {
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

  const helperId = req.user._id;

  // Generate Agora token for helper
  const role = 1; // 1 for publisher, 2 for subscriber
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    agoraAppId,
    agoraAppCertificate,
    meeting._id.toString(), // Channel name
    helperId.toString(), // User ID
    role,
    privilegeExpiredTs
  );

  console.log(`Helper joining Agora channel: ${meeting._id.toString()}`);

  res.status(200).json({
    status: "success",
    data: {
      token,
      channelName: meeting._id.toString(),
      uid: helperId.toString(),
      appId: agoraAppId,
    },
  });
});

export {
  createMeeting,
  getMeeting,
  createMeetingAgora,
  getGlobalMeetings,
  rejectMeeting,
  acceptSpecificMeeting,
  acceptMeetingAgora,
  endMeeting,
  getPendingSpecificMeetings,
  acceptFirstMeeting,
  checkPendingTimeouts,
};
