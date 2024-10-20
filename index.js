const express = require("express");
const multer = require("multer");
const File = require("./src/models/file");
const path = require("path");
const fs = require("fs");

const app = express();
const upload = multer({ dest: path.join(__dirname, "/uploads") }); // Files will be stored in 'uploads' directory
const sequelize = require("./src/config/db");

// Serve static files from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // Create the file data object with correct field names, including originalName
    const fileData = {
      filename: req.file.filename, // Matches 'filename' in the model
      originalName: req.file.originalname, // Captures original file name
      path: path.join(__dirname, "uploads", req.file.filename), // Matches 'path' in the model
      mimeType: req.file.mimetype, // Matches 'mimeType' in the model
      size: req.file.size, // Matches 'size' in the model
      owner: req.body.owner || "defaultOwner", // Matches 'owner' in the model, defaulting if no owner provided
    };

    // Create and save the file metadata in the database
    const file = await File.create(fileData);

    // Respond with the created file info
    res.json({ message: "File uploaded successfully", file });
  } catch (error) {
    // Handle any errors that occurred during file upload or saving
    res
      .status(500)
      .json({ error: "File upload failed", errorDetails: error.message });
  }
});
// Endpoint to download file
app.get("/download/:id", async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    res.download(file.dataValues.path, file.dataValues.originalName);
  } catch (error) {
    res.status(500).json({ error: "Error downloading file" });
  }
});

app.post("/upload-blob", upload.single("file"), async (req, res) => {
  try {
    const fileData = fs.readFileSync(req.file.path); // Read file as binary

    const newFile = await File.create({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileData: fileData,
    });

    // Clean up uploaded file from the filesystem
    fs.unlinkSync(req.file.path);

    res.json({ message: "File uploaded and stored in DB", newFile });
  } catch (error) {
    res.status(500).json({ error: "File upload failed" });
  }
});

app.get("/download-blob/:id", async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.set("Content-Type", file.mimeType);
    res.set("Content-Disposition", `attachment; filename=${file.originalName}`);
    res.send(file.fileData);
  } catch (error) {
    res.status(500).json({ error: "Error downloading file" });
  }
});

const PORT = process.env.SERVER_PORT;

// Automatically create table if it doesn't exist
sequelize
  .sync({ force: false })
  .then(() => {
    console.log("Database & tables created!");
  })
  .catch((err) => console.error("Unable to create tables:", err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
