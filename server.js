import fs from "fs/promises";
import path from "path";
import express from "express";
import cors from "cors";

// Define the base directory for file storage
const STORAGE_DIR = "./storage";

// Ensure that the storage directory exists
await fs.mkdir(STORAGE_DIR, { recursive: true });

// Create an Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: "application/pdf", limit: "50mb" }));

/**
 * Starts the HTTP server to listen on the specified port.
 *
 * @param {number} port - The port number on which the server listens.
 */
function startServer(port) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

/**
 * Handles GET requests to serve files.
 */
app.get("/*", async (req, res) => {
  const pathname = decodeURIComponent(req.path);
  const filePath = path.join(STORAGE_DIR, pathname);

  try {
    const file = await fs.readFile(filePath);
    res.status(200).send(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.status(404).send("File Not Found");
    } else {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
});

/**
 * Handles POST requests to upload files.
 */
app.post("/", async (req, res) => {
  try {
    const { folder1, folder2, folder3, fileName } = req.body;

    if (!folder1 || !folder2 || !folder3 || !fileName) {
      return res.status(400).json({
        message:
          "Missing required fields (fileName, folder1, folder2, folder3)",
      });
    }

    if (!req.is("application/pdf")) {
      return res.status(400).send("Only PDF files are allowed");
    }

    const folderPath = path.join(STORAGE_DIR, folder1, folder2, folder3);
    const filePath = path.join(folderPath, `${fileName}.pdf`);
    const location = `/${folder1}/${folder2}/${folder3}/${fileName}.pdf`;

    // Create folder structure if it doesn't exist
    await fs.mkdir(folderPath, { recursive: true });

    // Write the file to storage
    await fs.writeFile(filePath, req.body);

    res.status(201).json({
      message: "File stored",
      location: location,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * Adds CORS headers for preflight requests.
 */
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(200);
});

// Start the server on port 8000
startServer(8000);
