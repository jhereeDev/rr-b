const path = require("path");
const fs = require("fs");
const { generateSlug } = require("./helpers");

const getFiles = (rewardEntry) => {
  try {
    const memberId = rewardEntry.member_employee_id;
    const entryName = generateSlug(rewardEntry.project_name);

    // **Important Change:** Use a static base path for security
    const uploadDir = path.join(__dirname, "..", "uploads");
    const projectDir = path.join(uploadDir, memberId, entryName);

    if (!fs.existsSync(projectDir)) {
      return []; // Return an empty array if no files exist
    }

    // Get the list of attachment filenames from rewardEntry
    const attachmentFiles = rewardEntry.attachments
      ? rewardEntry.attachments.split(";")
      : [];

    const files = fs.readdirSync(projectDir);
    const fileInfo = files
      .filter((file) => attachmentFiles.includes(file))
      .map((file) => {
        const filePath = path.join(projectDir, file);
        const stats = fs.statSync(filePath);

        // **Crucial Change:** Construct a URL for the frontend
        const fileUrl = path
          .join(memberId, entryName, file)
          .replace(/\\/g, "/"); // Store relative path with forward slashes

        return {
          filename: file,
          path: fileUrl, // Provide the URL instead of absolute path
          size: stats.size,
        };
      });

    return fileInfo;
  } catch (error) {
    console.error("Error getting files:", error); // Log errors for debugging
    return []; // Return empty array to handle errors gracefully
  }
};

// Format files by split by ';' and map to object
const formattedFiles = (files) => {
  return files.split(";").map((file) => {
    return {
      filename: file,
    };
  });
};

const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    console.log(`Successfully deleted file: ${filePath}`);
  } catch (error) {
    console.error(`Error deleting file: ${filePath}`, error);
    throw error;
  }
};

module.exports = { getFiles, formattedFiles, deleteFile };
