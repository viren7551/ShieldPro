import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  photo: String,
  phone: String,
  role: { type: String, default: "admin" }
}, { timestamps: true });

const Admin = mongoose.model("Admin", AdminSchema);

export default Admin;
