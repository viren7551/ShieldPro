import mongoose from "mongoose";

const policyApplicationSchema = new mongoose.Schema(
  {
    applicantName: { type: String, required: true },
    email: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    address: { type: String, required: true },
    nidSsn: { type: String, required: true },
    policyId: { type: String, required: true },
    policyName: { type: String, required: true },
    nomineeName: { type: String, required: true },
    nomineeRelationship: { type: String, required: true },
    premiumAmount: { type: Number },
    hasPreExistingConditions: { type: Boolean, default: false },
    hasBeenHospitalized: { type: Boolean, default: false },
    consumesAlcohol: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "approved", "rejected", "paid"], default: "pending" },
    assignedAgent: { type: String, default: null },
    rejectionFeedback: { type: String, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("PolicyApplication", policyApplicationSchema);
