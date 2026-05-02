import mongoose from "mongoose";

const AgentApplicationSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  photo: { type: String },
  experience: { type: String, required: true },
  education: { type: String, required: true },
  motivation: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  appliedAt: { type: Date, default: Date.now }
});

const AgentApplication = mongoose.model("AgentApplication", AgentApplicationSchema);

export default AgentApplication;
