// models/Poll.js
import mongoose from "mongoose";

const voteSchema = new mongoose.Schema(
  {
    userId: String,
    option: String,
  },
  { _id: false }
);

const pollSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  question: { type: String, required: true },
  options: [String],
  votes: [voteSchema],
  expiresAt: Date,
});

export const Poll = mongoose.model("Poll", pollSchema);
