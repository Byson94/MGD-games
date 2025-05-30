const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "../")));

app.use(cors());

app.use(bodyParser.json());

mongoose
  .connect(process.env.MONGO_URI, {
    // This will be saved in render so the api is safe!
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB..."))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

const projectSchema = new mongoose.Schema({
  name: String,
  fileId: String,
});

const Project = mongoose.model("Project", projectSchema);

app.post("/addEntry", async (req, res) => {
  const { name, url } = req.body;

  if (name.length <= 20 && url.length <= 90) {
    try {
      const existingProject = await Project.findOne({ name });

      if (existingProject) {
        return res.status(400).json({
          success: false,
          message: "Project with this name already exists!",
        });
      }

      const driveRegex = /drive\.google\.com\/file\/d\/([^/]+)(?:\/|$|\?)/;
      const match = url.match(driveRegex);

      if (!match) {
        return res.status(400).json({
          success: false,
          message: "Invalid Google Drive URL!",
        });
      }

      // Extracted file ID
      let fileId = match[1];

      const newProject = new Project({
        name,
        fileId,
      });

      await newProject.save();

      res
        .status(201)
        .json({ success: true, message: "Project created successfully!" });
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: "Error creating project: " + err });
    }
  } else {
    res
      .status(500)
      .json({ success: false, message: "Error in project details!" });
  }
});

function getDriveDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

async function downloadAndProcessResources(downloadUrl) {
  const response = await axios.get(downloadUrl, {
    responseType: "arraybuffer",
    httpAgent: new (require("http").Agent)({ keepAlive: true }),
    httpsAgent: new (require("https").Agent)({ keepAlive: true }),
  });
  return response.data;
}

app.post("/load", async (req, res) => {
  const { name } = req.body;

  // Validate name input
  if (!name || typeof name !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid or missing 'name' parameter",
    });
  }

  try {
    const project = await Project.findOne({ name });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Construct the download URL from fileId stored in the database
    const downloadUrl = getDriveDownloadUrl(project.fileId);

    const zipData = await downloadAndProcessResources(downloadUrl);

    // Convert the ZIP buffer to a base64-encoded data URL
    const zipBlobUrl = `data:application/zip;base64,${Buffer.from(
      zipData
    ).toString("base64")}`;

    res.status(200).json({
      success: true,
      message: "Project loaded successfully!",
      blobUrl: zipBlobUrl,
    });
  } catch (err) {
    console.error("Error in /load route:", err);
    res.status(500).json({
      success: false,
      message: "Error loading the file: " + err.message,
    });
  }
});

app.post("/allProjects", async (req, res) => {
  try {
    // Fetch all projects from the database
    const projects = await Project.find();

    // Map the projects to only include the name field
    const projectNames = projects.map((project) => project.name);

    // Send the project names as a response
    res.status(200).json({
      success: true,
      projectNames: projectNames,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching projects: " + err.message,
    });
  }
});

app.set("view engine", "ejs");

app.get("/preview/:projectName", (req, res) => {
  const projectName = req.params.projectName;

  // Render the preview page dynamically using the projectName
  res.render("preview", { projectName: projectName });
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
