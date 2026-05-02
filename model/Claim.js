import mongoose from "mongoose";

const claimSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    policyName: { type: String, required: true },
    policyId: { type: String }, // For reference, usually the Policy _id or unique visual ID
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    documents: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Claim = mongoose.model("Claim", claimSchema);

export default Claim;
