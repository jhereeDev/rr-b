const express = require('express');
const {
    // Partner criteria operations
    addPartnerCriterias,
    addPartnerCriteria,
    getAllPartnerCriteria,
    getPartnerCriteria,
    updatePartnerCriteria,
    deletePartnerCriteria,
    getPublishedPartnerCriteria,
    getDraftPartnerCriteria,
    publishPartnerCriteria,
    publishAllPartnerCriteria,

    // Manager criteria operations
    addManagerCriterias,
    addManagerCriteria,
    getAllManagerCriteria,
    getManagerCriteria,
    updateManagerCriteria,
    deleteManagerCriteria,
    getPublishedManagerCriteria,
    getDraftManagerCriteria,
    publishManagerCriteria,
    publishAllManagerCriteria,

    // Shared operations
    getAllCriteriaGuidelines,
    getCriteriaByCategory,
    getCriteriaByDirectorApproval,
    getCriteriaByType,
} = require('../controllers/criteria_controller');
const { authenticated, checkRole, checkAdminRole } = require('../middlewares/auth');
const multer = require('multer');

const router = express.Router();

// Multer configuration to keep the file in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// router.post('/upload', authenticated, upload.single('excelFile'), addCriteria);
// router.get('/', authenticated, getAllCriteria);
// router.get('/guidelines', authenticated, getAllCriteriaGuidelines);
// router.post('/search/category', authenticated, getCriteriaByCategory);
// router.get('/:id', authenticated, getCriteria);
// router.put('/:id', authenticated, updateCriteria);
// router.delete('/:id', authenticated, deleteCriteria);
// router.get('/director/:director', authenticated, getCriteriaByDirector);

// =============================================================
// PARTNER CRITERIA ROUTES
// =============================================================

// Route for uploading partner criteria via Excel
router.post(
    '/partner/upload',
    authenticated,
    checkAdminRole, // Admin and Super Admin only
    upload.single('excelFile'),
    addPartnerCriterias
);

// Route for adding a single partner criteria
router.post(
    '/partner',
    authenticated,
    checkAdminRole, // Admin and Super Admin only
    addPartnerCriteria
);

// Route for getting all partner criteria
router.get('/partner', authenticated, getAllPartnerCriteria);

// Route for deleting a partner criteria
router.delete(
    '/partner/:id',
    authenticated,
    checkAdminRole, // Admin and Super Admin only
    deletePartnerCriteria
);

// Route for getting all published partner criteria
router.get('/partner/published', authenticated, getPublishedPartnerCriteria);

// Route for getting all draft partner criteria
router.get(
    '/partner/drafts',
    authenticated,
    getDraftPartnerCriteria
);

// Route for publishing all draft partner criteria
router.put(
    '/partner/publish-all',
    authenticated,
    publishAllPartnerCriteria
);

// Route for getting a single partner criteria by ID
router.get('/partner/:id', authenticated, getPartnerCriteria);

// Route for updating a partner criteria
router.put(
    '/partner/:id',
    authenticated,
    updatePartnerCriteria
);

// Route for publishing a single partner criteria
router.put(
    '/partner/:id/publish',
    authenticated,
    publishPartnerCriteria
);

// =============================================================
// MANAGER CRITERIA ROUTES
// =============================================================

// Route for uploading manager criteria via Excel
router.post(
    '/manager/upload',
    authenticated,
    checkAdminRole, // Admin and Super Admin only
    upload.single('excelFile'),
    addManagerCriterias
);

// Route for adding a single manager criteria
router.post(
    '/manager',
    authenticated,
    checkAdminRole, // Admin and Super Admin only
    addManagerCriteria
);

// Route for getting all manager criteria
router.get('/manager', authenticated, getAllManagerCriteria);

// Route for deleting a manager criteria
router.delete(
    '/manager/:id',
    authenticated,
    checkAdminRole, // Admin and Super Admin only
    deleteManagerCriteria
);

// Route for getting all published manager criteria
router.get('/manager/published', authenticated, getPublishedManagerCriteria);

// Route for getting all draft manager criteria
router.get(
    '/manager/drafts',
    authenticated,
    getDraftManagerCriteria
);

// Route for publishing all draft manager criteria
router.put(
    '/manager/publish-all',
    authenticated,
    publishAllManagerCriteria
);

// Route for getting a single manager criteria by ID
router.get('/manager/:id', authenticated, getManagerCriteria);

// Route for updating a manager criteria
router.put(
    '/manager/:id',
    authenticated,
    updateManagerCriteria
);

// Route for publishing a single manager criteria
router.put(
    '/manager/:id/publish',
    authenticated,
    publishManagerCriteria
);

// =============================================================
// SHARED ROUTES
// =============================================================

// Route for getting all criteria guidelines
router.get('/guidelines', authenticated, getAllCriteriaGuidelines);

// Route for getting criteria by category
router.post('/category', authenticated, getCriteriaByCategory);

// Route for getting criteria by director approval
router.get(
    '/director-approval/:status',
    authenticated,
    getCriteriaByDirectorApproval
);

// Route for getting criteria by type
router.get(
    '/type/:type',
    authenticated,
    checkRole([5]),
    getCriteriaByType
);

// =============================================================
// BACKWARD COMPATIBILITY ROUTES
// =============================================================

// These routes maintain backward compatibility with existing code
router.get('/', authenticated, getAllPartnerCriteria);
router.get('/:id', authenticated, getPartnerCriteria);
router.put('/:id', authenticated, checkAdminRole, updatePartnerCriteria);
router.delete('/:id', authenticated, checkAdminRole, deletePartnerCriteria);

module.exports = router;
