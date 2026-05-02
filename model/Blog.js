import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
  },
  authorEmail: {
    type: String,
    required: true,
  },
  authorName: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  totalVisits: {
    type: Number,
    default: 0,
  },
  authorPhoto: {
    type: String,
  },
});

const Blog = mongoose.model("Blog", blogSchema);

export default Blog;
