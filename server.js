// ==== server.js ====
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/resume_builder", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Failed:", err));

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

const draftSchema = new mongoose.Schema({
    email: { type: String, required: true },
    name: String,
    jobTitle: String,
    contact: [String],
    education: String,
    skills: [String],
    profile: String,
    experience: String
});
const Draft = mongoose.model("Draft", draftSchema);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Multer configuration for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = "public/uploads";
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const email = req.body.email;
        cb(null, `${email}.jpg`);
    }
});
const upload = multer({ storage });

app.post("/uploadProfilePic", upload.single("profilePic"), (req, res) => {
    res.json({ success: true, message: "Profile picture uploaded successfully!" });
});

app.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists!", redirect: "/login.html" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.json({ success: true, message: "Signup successful!", redirect: "/login.html" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

app.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found. Please sign up.", redirect: "/signup.html" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect password. Please try again.", redirect: "/login.html" });
        }
        res.json({ success: true, message: "Login successful!", redirect: "/index.html" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

app.post("/saveDraft", async (req, res) => {
    try {
        const { email, name, jobTitle, contact, education, skills, profile, experience } = req.body;
        const existingDraft = await Draft.findOne({ email });
        if (existingDraft) {
            await Draft.updateOne({ email }, { name, jobTitle, contact, education, skills, profile, experience });
            res.json({ success: true, message: "Draft updated successfully!" });
        } else {
            const draft = new Draft(req.body);
            await draft.save();
            res.json({ success: true, message: "Draft saved successfully!" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error saving draft", error });
    }
});

app.get("/loadDraft", async (req, res) => {
    try {
        const { email } = req.query;
        const draft = await Draft.findOne({ email });
        if (draft) {
            res.json({ success: true, draft });
        } else {
            res.status(404).json({ message: "No draft found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error loading draft", error });
    }
});

app.get("/getUsers", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Error fetching users", error: err });
    }
});

const PORT = 3002;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));