import mongoose from "mongoose";

const policySchema = new mongoose.Schema(
  {
    policyTitle: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    minimumAge: { type: Number, required: true },
    maximumAge: { type: Number, required: true },
    coverageRange: { type: String, required: true },
    durationOptions: { type: String, required: true },
    basePremiumRate: { type: Number, required: true },
    policyImage: { type: String }, 
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

const Policy = mongoose.model("Policy", policySchema);

export default Policy;
