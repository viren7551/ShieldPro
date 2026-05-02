import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    transactionId: { type: String, required: true },
    premiumAmount: { type: Number, required: true },
    applicationId: { type: String, required: true },
    policyId: { type: String, required: true },
    policyName: { type: String, required: true },
    paymentFrequency: { type: String, default: 'Monthly' },
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, default: 'Paid' },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
