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
      enum: ["pending", "accepted", "ended", "rejected", "timeout"],
      required: true,
      default: "pending",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    acceptedAt: {
      type: Date,
    },

    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if meeting has timed out waiting for helper
meetingSchema.methods.checkPendingTimeout = function () {
  if (this.status === "pending") {
    const waitingTime = Date.now() - this.createdAt;
    return waitingTime > 30 * 1000; // 5 minutes in milliseconds
  }
  return false;
};

// Pre-save middleware to update timestamps
meetingSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "accepted") {
      this.acceptedAt = Date.now();
    } else if (this.status === "ended") {
      this.endedAt = Date.now();
    }
  }
  next();
});

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;
