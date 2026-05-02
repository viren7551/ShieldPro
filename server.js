import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import Admin from "./model/Admin.js";
import Agent from "./model/Agent.js";
import Customer from "./model/Customer.js";
import Policy from "./model/Policy.js";
import Claim from "./model/Claim.js";
import Review from "./model/Review.js";
import Blog from "./model/Blog.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';


dotenv.config();

const app = express();
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

// --- MULTER SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});
// --------------------



connectDB();

// --- AUTOMATIC ADMIN SEEDING ---
const initializeAdmin = async () => {
  try {
    const adminEmail = "admin@gmail.com";
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`[Database] Verified Admin Access for: ${adminEmail}`);
    } else {
      await Admin.create({
        name: "Viren (Admin)",
        email: adminEmail,
        password: "Admin123", // Update if you implement bcrypt later
        role: "admin"
      });
      console.log(`[Database] Created Admin User: ${adminEmail}`);
    }
  } catch (err) {
    console.error("[DatabaseError] Could not initialize admin:", err.message);
  }
};
initializeAdmin();
// -------------------------------

// POST ROUTE
app.post("/users", async (req, res) => {
  try {
    const { role, email, ...userData } = req.body;
    
    // Check if email already exists across any role
    let existingUser = await Customer.findOne({ email });
    if (!existingUser) existingUser = await Agent.findOne({ email });
    if (!existingUser) existingUser = await Admin.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered. Please sign in instead." });
    }

    let newUser;
    if (role === "admin") {
      newUser = await Admin.create({ email, ...userData, role });
    } else if (role === "agent") {
      newUser = await Agent.create({ email, ...userData, role });
    } else {
      newUser = await Customer.create({ email, ...userData, role: "customer" });
    }
    res.status(201).json(newUser);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Email is already registered." });
    }
    res.status(500).json({
      error: err.message,
    });
  }
});

// LOGIN ROUTE
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check all collections sequentially
    let user = await Customer.findOne({ email });
    if (!user) {
        user = await Agent.findOne({ email });
    }
    if (!user) {
        user = await Admin.findOne({ email });
    }
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    res.status(200).json({ user, token: "live-session-token" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GOOGLE AUTH ROUTE
app.post("/api/google-auth", async (req, res) => {
  try {
    const { email, name, photo, googleId } = req.body;
    
    // Check all collections sequentially
    let user = await Customer.findOne({ email });
    if (!user) {
        user = await Agent.findOne({ email });
    }
    if (!user) {
        user = await Admin.findOne({ email });
    }
    
    // If no user exists, create as Customer
    let isNewUser = false;
    if (!user) {
        user = await Customer.create({
            name,
            email,
            photo,
            password: googleId || email, // Generate a dummy password or use Google ID
            role: "customer"
        });
        isNewUser = true;
    }
    
    res.status(isNewUser ? 201 : 200).json({ user, token: "live-session-token", isNewUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESET PASSWORD ROUTE
app.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    // Check all collections sequentially and update if found
    let user = await Customer.findOneAndUpdate({ email }, { password: newPassword }, { new: true });
    
    if (!user) {
        user = await Agent.findOneAndUpdate({ email }, { password: newPassword }, { new: true });
    }
    if (!user) {
        user = await Admin.findOneAndUpdate({ email }, { password: newPassword }, { new: true });
    }
    
    if (!user) {
      return res.status(404).json({ error: "User with this email not found" });
    }
    
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== POLICIES ====================

// PUBLIC: GET ALL POLICIES
app.get("/policies", async (req, res) => {
  try {
    const policies = await Policy.find();
    res.status(200).json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUBLIC: GET POLICY BY ID
app.get("/policies/:id", async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) return res.status(404).json({ error: "Policy not found" });
    res.status(200).json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: GET ALL POLICIES
app.get("/admin/policies", async (req, res) => {
  try {
    const policies = await Policy.find().sort({ createdAt: -1 });
    res.status(200).json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: CREATE NEW POLICY
app.post("/admin/policies", async (req, res) => {
  try {
    const newPolicy = await Policy.create(req.body);
    res.status(201).json(newPolicy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: UPDATE POLICY
app.patch("/admin/policies/:id", async (req, res) => {
  try {
    const updatedPolicy = await Policy.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPolicy) return res.status(404).json({ error: "Policy not found" });
    res.status(200).json(updatedPolicy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: DELETE POLICY
app.delete("/admin/policies/:id", async (req, res) => {
  try {
    const deletedPolicy = await Policy.findByIdAndDelete(req.params.id);
    if (!deletedPolicy) return res.status(404).json({ error: "Policy not found" });
    res.status(200).json({ message: "Policy deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

import AgentApplication from "./model/AgentApplication.js";

// AGENT APPLICATIONS (Customer applying)
app.post("/agent-applications", async (req, res) => {
  try {
    const newApp = await AgentApplication.create(req.body);
    res.status(201).json(newApp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN ROUTES: GET Applications
app.get("/admin/agent-applications", async (req, res) => {
  try {
    const apps = await AgentApplication.find();
    res.status(200).json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

import PolicyApplication from "./model/PolicyApplication.js";

// POLICY APPLICATIONS (Customer applying for a policy)
app.post("/policy-applications", async (req, res) => {
  try {
    const { email, policyName } = req.body;

    const existingApplication = await PolicyApplication.findOne({
      email,
      policyName,
      status: { $ne: "rejected" }
    });

    if (existingApplication) {
      return res.status(400).json({ error: "You have already applied for or purchased this policy." });
    }

    const newApp = await PolicyApplication.create(req.body);
    res.status(201).json(newApp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN ROUTES: GET Policy Applications
app.get("/admin/policy-applications", async (req, res) => {
  try {
    const apps = await PolicyApplication.find().sort({ createdAt: -1 });
    res.status(200).json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CUSTOMER ROUTES: GET My Policy Applications
app.get("/policy-applications/my-applications", async (req, res) => {
  try {
    const { email } = req.query; // the easiest way since email is saved
    if (!email) return res.status(400).json({ error: "Email required" });
    const apps = await PolicyApplication.find({ email }).sort({ createdAt: -1 });
    res.status(200).json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN ROUTES: UPDATE Policy Application (assign agent / reject / approve)
app.patch("/admin/policy-applications/:id", async (req, res) => {
  try {
    const updates = req.body; // can contain: assignedAgent, status, rejectionFeedback
    const updated = await PolicyApplication.findByIdAndUpdate(
      req.params.id,
      { ...updates },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Application not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN ROUTES: ACTIVE AGENTS
app.get("/admin/agents", async (req, res) => {
  try {
    const agents = await Agent.find();
    res.status(200).json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN ROUTES: APPROVE / REJECT APPLICATION
app.patch("/admin/agent-applications/:id", async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    const application = await AgentApplication.findByIdAndUpdate(req.params.id, { status }, { new: true });
    
    if (status === 'approved' && application) {
      // 1. Find Customer
      const customerToUpgrade = await Customer.findById(application.customerId);
      if (customerToUpgrade) {
        // 2. Create Agent
        await Agent.create({
          name: customerToUpgrade.name,
          email: customerToUpgrade.email,
          password: customerToUpgrade.password, // KEEPING LOGIN CREDENTIALS
          photo: customerToUpgrade.photo,
          role: 'agent'
        });
        
        // 3. Remove from Customer Table
        await Customer.findByIdAndDelete(customerToUpgrade._id);
      }
    }
    
    res.status(200).json(application);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users", async (req, res) => {
  try {
    const admins = await Admin.find().lean();
    const agents = await Agent.find().lean();
    const customers = await Customer.find().lean();
    const users = [...admins, ...agents, ...customers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN ROUTES: DEMOTE / PROMOTE AGENT
app.patch("/users/:email/role", async (req, res) => {
  try {
    const email = req.params.email;
    const newRole = req.body.role;

    // Demote agent to customer
    if (newRole === 'customer') {
      const agentToDemote = await Agent.findOne({ email });
      if (agentToDemote) {
        const { _id, ...data } = agentToDemote.toObject();
        await Customer.create({ ...data, role: 'customer' });
        await Agent.deleteOne({ email });
      }
    } 
    // Promote customer to agent
    else if (newRole === 'agent') {
      const customerToPromote = await Customer.findOne({ email });
      if (customerToPromote) {
        const { _id, ...data } = customerToPromote.toObject();
        await Agent.create({ ...data, role: 'agent' });
        await Customer.deleteOne({ email });
      }
    }
    
    res.status(200).json({ message: "Role updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AGENT ROUTES: GET Assigned Policies
app.get("/agent/assigned-applications", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Agent email required" });
    const apps = await PolicyApplication.find({ assignedAgent: email }).sort({ createdAt: -1 });
    res.status(200).json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AGENT ROUTES: UPDATE application status
app.patch("/agent/policy-applications/status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await PolicyApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Application not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== PROFILE ====================
app.get("/users/:email/profile", async (req, res) => {
  try {
    const { email } = req.params;
    let user = await Customer.findOne({ email }).lean();
    if (!user) user = await Agent.findOne({ email }).lean();
    if (!user) user = await Admin.findOne({ email }).lean();

    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/users/:email/profile", async (req, res) => {
  try {
    const { email } = req.params;
    const { name, phone, photo } = req.body;

    if (phone) {
      // Check if phone already belongs to someone else
      let phoneExists = await Customer.findOne({ phone, email: { $ne: email } });
      if (!phoneExists) phoneExists = await Agent.findOne({ phone, email: { $ne: email } });
      if (!phoneExists) phoneExists = await Admin.findOne({ phone, email: { $ne: email } });
      
      if (phoneExists) {
        return res.status(400).json({ error: "Phone number is already in use by another account." });
      }
    }

    const updateData = { name, phone, photo };
    
    let updated = await Customer.findOneAndUpdate({ email }, updateData, { new: true });
    if (!updated) updated = await Agent.findOneAndUpdate({ email }, updateData, { new: true });
    if (!updated) updated = await Admin.findOneAndUpdate({ email }, updateData, { new: true });

    if (!updated) return res.status(404).json({ error: "User not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==================== POLICIES ====================
app.post("/admin/policies", async (req, res) => {
  try {
    const newPolicy = await Policy.create(req.body);
    res.status(201).json(newPolicy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/admin/policies", async (req, res) => {
  try {
    const policies = await Policy.find({}).sort({ createdAt: -1 });
    res.status(200).json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/policies", async (req, res) => {
  try {
    // Public endpoint to get policies
    const policies = await Policy.find({ status: "active" }).sort({ createdAt: -1 });
    res.status(200).json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/policies/:id", async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) return res.status(404).json({ error: "Policy not found" });
    res.status(200).json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/admin/policies/:id", async (req, res) => {
  try {
    const updated = await Policy.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Policy not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/admin/policies/:id", async (req, res) => {
  try {
    const deleted = await Policy.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Policy not found" });
    res.status(200).json({ message: "Policy deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CLAIMS ====================
app.post("/claims", async (req, res) => {
  try {
    const newClaim = await Claim.create(req.body);
    res.status(201).json(newClaim);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/customer/claims", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });
    const claims = await Claim.find({ userEmail: email }).sort({ createdAt: -1 });
    res.status(200).json(claims);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/admin/claims", async (req, res) => {
  try {
    const claims = await Claim.find({}).sort({ createdAt: -1 });
    res.status(200).json(claims);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/admin/claims/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Claim.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Claim not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== REVIEWS ====================

// POST: Customer submits a review
app.post("/reviews", async (req, res) => {
  try {
    const { reviewerName, reviewerEmail, reviewerPhoto, rating, feedback, policyName } = req.body;
    if (!reviewerName || !reviewerEmail || !rating || !feedback) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const newReview = await Review.create({
      reviewerName,
      reviewerEmail,
      reviewerPhoto: reviewerPhoto || "",
      rating,
      feedback,
      policyName: policyName || "",
    });
    res.status(201).json(newReview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Public — fetch all reviews sorted newest first
app.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find().lean().sort({ createdAt: -1 });
    
    const reviewsWithPhoto = await Promise.all(reviews.map(async (review) => {
      let user = await Customer.findOne({ email: review.reviewerEmail }).lean();
      if (!user) user = await Agent.findOne({ email: review.reviewerEmail }).lean();
      if (!user) user = await Admin.findOne({ email: review.reviewerEmail }).lean();
      
      let currentPhoto = review.reviewerPhoto;
      if (user && user.photo) {
        currentPhoto = user.photo;
      }
      
      return {
        ...review,
        reviewerPhoto: currentPhoto
      };
    }));
    
    res.status(200).json(reviewsWithPhoto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Admin removes a review
app.delete("/admin/reviews/:id", async (req, res) => {
  try {
    const deleted = await Review.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Review not found" });
    res.status(200).json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TRANSACTIONS ====================
app.get("/admin/transactions", async (req, res) => {
  try {
    const transactions = await Payment.find().sort({ paymentDate: -1 });
    res.status(200).json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== AGENT DASHBOARD STATS ====================
app.get("/agent/dashboard-stats", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Agent email required" });

    const assignedApps = await PolicyApplication.find({ assignedAgent: email });
    const blogs = await Blog.find({ authorEmail: email });

    const stats = {
      totalAssignedApplications: assignedApps.length,
      totalCustomers: new Set(assignedApps.map(app => app.email)).size,
      statusCounts: assignedApps.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, { pending: 0, approved: 0, rejected: 0, paid: 0 }),
      totalBlogs: blogs.length,
    };

    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== BLOGS ====================
app.post("/blogs", async (req, res) => {
  try {
    const newBlog = await Blog.create(req.body);
    res.status(201).json(newBlog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find().lean().sort({ createdAt: -1 });
    
    const blogsWithPhoto = await Promise.all(blogs.map(async (blog) => {
      let author = await Agent.findOne({ email: blog.authorEmail }).lean();
      if (!author) author = await Admin.findOne({ email: blog.authorEmail }).lean();
      
      return {
        ...blog,
        authorPhoto: (author && author.photo) ? author.photo : `https://ui-avatars.com/api/?name=${encodeURIComponent(blog.authorName || 'User')}&background=random`
      };
    }));
    
    res.status(200).json(blogsWithPhoto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/blog/:id", async (req, res) => {
  try {
    const shouldIncrement = req.query.increment === 'true';
    let blog;
    
    if (shouldIncrement) {
      blog = await Blog.findByIdAndUpdate(
        req.params.id,
        { $inc: { totalVisits: 1 } },
        { new: true }
      );
    } else {
      blog = await Blog.findById(req.params.id);
    }
    
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    
    let author = await Agent.findOne({ email: blog.authorEmail });
    if (!author) author = await Admin.findOne({ email: blog.authorEmail });
    
    const blogObj = blog.toObject();
    if (author && author.photo) {
      blogObj.authorPhoto = author.photo;
    } else {
      blogObj.authorPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(blog.authorName || 'User')}&background=random`;
    }

    res.status(200).json(blogObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/blog/:id", async (req, res) => {
  try {
    const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedBlog) return res.status(404).json({ error: "Blog not found" });
    res.status(200).json(updatedBlog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/blog/:id", async (req, res) => {
  try {
    const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
    if (!deletedBlog) return res.status(404).json({ error: "Blog not found" });
    res.status(200).json({ message: "Blog deleted successfully", deletedCount: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/agent/my-blogs", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Author email required" });
    const blogs = await Blog.find({ authorEmail: email }).lean().sort({ createdAt: -1 });
    
    const blogsWithPhoto = await Promise.all(blogs.map(async (blog) => {
      let author = await Agent.findOne({ email: blog.authorEmail }).lean();
      if (!author) author = await Admin.findOne({ email: blog.authorEmail }).lean();
      
      return {
        ...blog,
        authorPhoto: (author && author.photo) ? author.photo : `https://ui-avatars.com/api/?name=${encodeURIComponent(blog.authorName || 'User')}&background=random`
      };
    }));
    
    res.status(200).json(blogsWithPhoto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PAYMENTS ====================
import Payment from "./model/Payment.js";

// GET /payments/status
app.get("/payments/status", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });
    
    // 1. Get all policy applications for this user
    const applications = await PolicyApplication.find({ email }).lean();
    
    // 2. Get real historical Payments
    const payments = await Payment.find({ email }).lean();

    // Map unpaid applications into "Upcoming Payments", filtering out those that already exist in Payments DB!
    const pendingApps = [];
    const seenPolicies = new Set();

    // Sort descending by creation date to guarantee we only keep the newest accidental duplicate
    const sortedApplications = applications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    for (const app of sortedApplications) {
        if (app.status !== 'approved') continue;
        // Safeguard: if a payment record already logs this app as complete, hide it from Upcoming!
        if (payments.some(p => String(p.applicationId) === String(app._id))) continue;
        
        // Anti-spam deduplication: suppress multiple unpaid application instances for the exact same policy
        if (seenPolicies.has(app.policyId)) continue;

        seenPolicies.add(app.policyId);
        pendingApps.push(app);
    }

    const upcoming = await Promise.all(pendingApps.map(async (app) => {
       let premium = app.premiumAmount;
       if (!premium) {
           try {
               // Fallback: Dynamically fetch default premium if older application is missing the field
               const policyData = await Policy.findOne({ policyTitle: app.policyName }).lean();
               if (policyData && policyData.basePremiumRate) premium = policyData.basePremiumRate;
           } catch (e) {
               console.log("Error linking policy premium", e.message);
           }
       }
       if (!premium) premium = 12000;
       
       return {
           _id: app._id, 
           policyId: app.policyId,
           policyName: app.policyName,
           premiumAmount: premium,
           paymentFrequency: 'Annual',
           paymentStatus: app.status === 'approved' ? 'Pending' : 'Pending',
           paymentDate: app.createdAt
       };
    }));
    

    const transactions = [...upcoming, ...payments];
    res.status(200).json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /payments
app.post("/payments", async (req, res) => {
  try {
     const payment = await Payment.create(req.body);
     
     // Update PolicyApplication status to paid if ID exists
     let applicationUpdateResult = null;
     if (req.body.applicationId) {
        applicationUpdateResult = await PolicyApplication.findByIdAndUpdate(
           req.body.applicationId,
           { status: 'paid' },
           { new: true }
        );
     }

     res.status(201).json({ transactionResult: { insertedId: payment._id }, applicationUpdateResult });
  } catch (err) {
     res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is Running on the port ${PORT}`);
});