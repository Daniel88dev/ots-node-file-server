import fs from "fs/promises";
import path from "path";
import express from "express";
import cors from "cors";
import multer from "multer";

// Define the base directory for file storage
const STORAGE_DIR = "./storage";

// Ensure that the storage directory exists
await fs.mkdir(STORAGE_DIR, { recursive: true });

// Configure multer for handling multipart form-data
const upload = multer();

/**
 * Start the HTTP server to handle requests for uploading and serving files.
 *
 * @param {number} port - The port number on which the server listens.
 */
function startServer(port) {
  const app = express();

  // Middleware setup
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  /**
   * Route: Serve a PDF file based on the requested path.
   * - Uses HTTP GET method.
   * - Expects the file path in the URL.
   */
  app.get("/*", async (req, res) => {
    const pathname = decodeURIComponent(req.path);
    const filePath = path.join(STORAGE_DIR, pathname);

    try {
      const file = await fs.readFile(filePath);
      res.set("Content-Type", "application/pdf");
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
   * Route: Upload a PDF file with folder and file name information.
   * - Uses HTTP POST method.
   * - Expects multipart form-data with the following fields:
   *   - `file`: The uploaded file (must be a PDF file).
   *   - `folder1`, `folder2`, `folder3`: Folder structure for storing the file.
   *   - `fileName`: The desired name for the file (without the `.pdf` extension).
   */
  app.post("/", upload.single("file"), async (req, res) => {
    try {
      const { folder1, folder2, folder3, fileName } = req.body;
      const file = req.file;

      // Validate required fields
      if (!file || !folder1 || !folder2 || !folder3 || !fileName) {
        return res.status(400).json({
          message:
            "Missing required fields (file, folder1, folder2, folder3, fileName).",
        });
      }

      // Validate file type
      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDF files are allowed." });
      }

      // Create folder structure
      const folderPath = path.join(STORAGE_DIR, folder1, folder2, folder3);
      const filePath = path.join(folderPath, `${fileName}.pdf`);
      const location = `/${folder1}/${folder2}/${folder3}/${fileName}.pdf`;

      await fs.mkdir(folderPath, { recursive: true });

      // Write the uploaded file to storage
      await fs.writeFile(filePath, file.buffer);

      res.status(201).json({
        message: "File stored successfully",
        location: location,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Start the server
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

// Start the server on port 8000
startServer(8000);
