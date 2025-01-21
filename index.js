const express = require("express");
const multer = require("multer");
const File = require("./src/models/file");
const path = require("path");
const fs = require("fs");
const sequelize = require("./src/config/db");
const app = express();
const upload = multer({ dest: path.join(__dirname, "/storage") }); // Files will be stored in 'storage' directory

// Multer setup for images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const imageDir = path.join(__dirname, "/storage/images");
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true }); // Create directory if it doesn't exist
    }
    cb(null, imageDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadImage = multer({ storage: imageStorage });

// Serve static files from 'storage/images'
app.use(
  "/storage/images",
  express.static(path.join(__dirname, "storage/images"))
);

app.get("/", async (req, res) => {
  try {
    const db = await sequelize.sync({ force: false });
    console.log({ db });
    res.send({
      message: "Hellow Hemant boss!",
      db: db.config,
    });
  } catch (error) {
    console.error("Unable to create tables:", error);
    res.send({ err: error.message });
  }
});

// Image upload endpoint
app.post("/upload-image", uploadImage.single("file"), async (req, res) => {
  try {
    const imageDetails = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: path.join("storage/images", req.file.filename),
      mimeType: req.file.mimetype,
      size: req.file.size,
      owner: req.body.owner || "defaultOwner",
    };

    // Save image details in the database
    const image = await File.create(imageDetails);

    res.json({ message: "Image uploaded successfully", image });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Image upload failed", errorDetails: error.message });
  }
});

// File upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const fileData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: path.join(__dirname, "storage", req.file.filename),
      mimeType: req.file.mimetype,
      size: req.file.size,
      owner: req.body.owner || "defaultOwner",
    };

    const file = await File.create(fileData);

    res.json({ message: "File uploaded successfully", file });
  } catch (error) {
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
    res.download(file.path, file.originalName);
  } catch (error) {
    res.status(500).json({ error: "Error downloading file" });
  }
});

const PORT = process.env.SERVER_PORT;

sequelize
  .sync({ force: false })
  .then(() => {
    console.log("Database & tables created!");
  })
  .catch((err) => console.error("Unable to create tables:", err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
