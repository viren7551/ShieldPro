import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    reviewerName: { type: String, required: true },
    reviewerEmail: { type: String, required: true },
    reviewerPhoto: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String, required: true },
    policyName: { type: String, default: "" },
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", ReviewSchema);

export default Review;
