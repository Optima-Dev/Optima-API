import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema({
  seekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  helperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  customFirstName: {
    type: String,
    required: [true, "First name is required"],
    minlength: [2, "First name must be at least 2 characters"],
  },

  customLastName: {
    type: String,
    required: [true, "Last name is required"],
    minlength: [2, "Last name must be at least 2 characters"],
  },
});

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);

export default FriendRequest;
