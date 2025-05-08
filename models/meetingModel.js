import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["global", "specific"],
      required: true,
      default: "global",
    },

    helper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "ended", "rejected"],
      required: true,
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;
