const express = require("express");
const multer = require("multer");
const {
  add_reward,
  update_reward,
  get_rewards,
  get_reward,
  get_rewards_by_member,
  download_attachment,
  admin_update_reward,
} = require("../controllers/reward_points_controller");
const {
  authenticated,
  checkRole,
  checkAdminRole,
} = require("../middlewares/auth");
const storage = require("../config/multer_config");
const { IsOwnerOfRewardPoints } = require("../middlewares/authorized");
const RewardPoints = require("../classes/RewardPoints");
const ApprovalEntry = require("../classes/ApprovalEntry");

const router = express.Router();

const upload = multer({ storage });

// Middleware to set original member ID and project name for file uploads
const setOriginalData = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id) {
      const approvalEntry = await ApprovalEntry.findById(id);
      if (approvalEntry) {
        req.originalMemberId = approvalEntry.rewards_entry.member_employee_id;
        req.originalProjectName = approvalEntry.rewards_entry.project_name;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Route to add a new entry for reward points. Only accessble to users with roles 1, 2, 3, 4, 5
router.post(
  "/",
  authenticated,
  checkRole([1, 4, 5, 6]),
  upload.array("files"),
  add_reward
);

// Route to update a specific reward point. Only accessble to users with roles 1, 2, 3, 4, 5
router.put(
  "/:id",
  authenticated,
  checkRole([1, 5, 6]),
  IsOwnerOfRewardPoints,
  upload.array("files"),
  update_reward
);

// Route to get all reward points. Only accessble to users with roles 1, 2, 3, 4, 5
router.get("/", authenticated, checkRole([1, 2, 3, 4, 5]), get_rewards);

// Route to get all reward points for a specific member. Only accessble to users with role 1, 2, 3
router.get(
  "/member",
  authenticated,
  checkRole([1, 4, 5]),
  get_rewards_by_member
);

// Route to download attachment for a specific reward point. Only accessble to users with roles 1, 2, 3, 4, 5
router.get("/download", authenticated, download_attachment);

// Route to get a specific reward point. Only accessble to users with roles 1,  4, 5
router.get("/:id", authenticated, checkRole([1, 4, 5]), get_reward);

// Route to update a specific reward point. Only accessble to users with roles 1, 2, 3, 4, 5
router.put(
  "/admin/:id",
  authenticated,
  checkRole([1, 5, 6]),
  setOriginalData,
  upload.array("files"),
  admin_update_reward
);

module.exports = router;
