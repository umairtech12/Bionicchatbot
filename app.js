// app.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const ApiKey = require("./models/ApiKey");
const cors = require("cors");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware to check manager API key
const checkManagerKey = (req, res, next) => {
  const managerKey = req.headers["x-manager-key"];
  if (managerKey !== process.env.MANAGER_KEY) {
    return res.status(403).json({ message: "Invalid manager key." });
  }
  next();
};

// Endpoint to add a new API key
app.post("/api/keys", checkManagerKey, async (req, res) => {
  const { name, key } = req.body;
  const newKey = new ApiKey({ name, key });
  await newKey.save();
  res.status(201).json(newKey);
});

// Endpoint to retrieve an API key
app.get("/api/keys/:name", checkManagerKey, async (req, res) => {
  const { name } = req.params;

  try {
    const apiKey = await ApiKey.findOne({ name });
    if (!apiKey) {
      return res.status(404).json({ message: "API key not found." });
    }

    const decryptedKey = apiKey.getDecryptedKey();
    res.json({ key: decryptedKey });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving key", error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));