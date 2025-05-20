const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { generateSlug, generateFY } = require("../utils/helpers");

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!file) {
      return cb(null, null);
    }

    try {
      let employeeId;
      let projectSlug;

      if (req.params.id) {
        // This is an edit operation
        // We'll need to get the original member's ID and project name from the database
        // This should be done in the route handler before calling multer
        employeeId = req.originalMemberId.toString();
        projectSlug = generateSlug(req.originalProjectName);
      } else {
        // This is a new entry
        employeeId = req.userData.member_employee_id.toString();
        projectSlug = generateSlug(req.body.project_name);
      }

      const employeeDir = path.join(__dirname, "..", "uploads", employeeId);
      const rewardsDir = path.join(employeeDir, projectSlug);

      fs.mkdirSync(employeeDir, { recursive: true });
      if (!fs.existsSync(rewardsDir)) {
        fs.mkdirSync(rewardsDir);
      }

      cb(null, rewardsDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    if (!file) {
      return cb(null, null);
    }

    const fiscalYear = generateFY();
    const fileExt = path.extname(file.originalname);
    const originalNameSlug = generateSlug(
      path.basename(file.originalname, fileExt)
    );

    let employeeId;
    let projectSlug;

    if (req.params.id) {
      // This is an edit operation
      employeeId = req.originalMemberId.toString();
      projectSlug = generateSlug(req.originalProjectName);
    } else {
      // This is a new entry
      employeeId = req.userData.member_employee_id.toString();
      projectSlug = generateSlug(req.body.project_name);
    }

    const filename = `${fiscalYear}_${employeeId}_${projectSlug}_${originalNameSlug}${fileExt}`;
    cb(null, filename);
  },
});

module.exports = storage;
