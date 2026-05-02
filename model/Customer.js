import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  photo: String, // from frontend usage
  phone: String,
  role: { type: String, default: "customer" }
}, { timestamps: true });

const Customer = mongoose.model("Customer", CustomerSchema);

export default Customer;
