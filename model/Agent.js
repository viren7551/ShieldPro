import mongoose from "mongoose";

const AgentSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  photo: String, // from frontend usage
  phone: String,
  role: { type: String, default: "agent" }
}, { timestamps: true });

const Agent = mongoose.model("Agent", AgentSchema);

export default Agent;
