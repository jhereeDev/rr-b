const express = require('express');
const {
    // Partner criteria operations
    addPartnerCriterias,
    addPartnerCriteria,
    getAllPartnerCriteria,
    getPartnerCriteria,
    updatePartnerCriteria,
    deletePartnerCriteria,

    // Manager criteria operations
    addManagerCriterias,
    addManagerCriteria,
    getAllManagerCriteria,
    getManagerCriteria,
    updateManagerCriteria,
    deleteManagerCriteria,

    // Shared operations
    getAllCriteriaGuidelines,
    getCriteriaByCategory,
    getCriteriaByDirectorApproval,
    getCriteriaByType,
} = require('../controllers/criteria_controller');
const { authenticated, checkRole } = require('../middlewares/auth');
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
    checkRole([1, 2]), // Admin and Super Admin only
    upload.single('excelFile'),
    addPartnerCriterias
);

// Route for adding a single partner criteria
router.post(
    '/partner',
    authenticated,
    checkRole([1, 2]), // Admin and Super Admin only
    addPartnerCriteria
);

// Route for getting all partner criteria
router.get('/partner', authenticated, getAllPartnerCriteria);

// Route for getting a single partner criteria by ID
router.get('/partner/:id', authenticated, getPartnerCriteria);

// Route for updating a partner criteria
router.put(
    '/partner/:id',
    authenticated,
    checkRole([1, 2]), // Admin and Super Admin only
    updatePartnerCriteria
);

// Route for deleting a partner criteria
router.delete(
    '/partner/:id',
    authenticated,
    checkRole([1, 2]), // Admin and Super Admin only
    deletePartnerCriteria
);

// =============================================================
// MANAGER CRITERIA ROUTES
// =============================================================

// Route for uploading manager criteria via Excel
router.post(
    '/manager/upload',
    authenticated,
    checkRole([1, 2]), // Admin and Super Admin only
    upload.single('excelFile'),
    addManagerCriterias
);

// Route for adding a single manager criteria
router.post(
    '/manager',
    authenticated,
    checkRole([1, 2]), // Admin and Super Admin only
    addManagerCriteria
);

// Route for getting all manager criteria
router.get('/manager', authenticated, getAllManagerCriteria);

// Route for getting a single manager criteria by ID
router.get('/manager/:id', authenticated, getManagerCriteria);

// Route for updating a manager criteria
router.put(
    '/manager/:id',
    authenticated,
    checkRole([1, 2]), // Admin and Super Admin only
    updateManagerCriteria
);

// Route for deleting a manager criteria
router.delete(
    '/manager/:id',
    authenticated,
    checkRole([1, 2]), // Admin and Super Admin only
    deleteManagerCriteria
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
    checkRole([1, 2, 5]),
    getCriteriaByType
);

// =============================================================
// BACKWARD COMPATIBILITY ROUTES
// =============================================================

// These routes maintain backward compatibility with existing code
router.get('/', authenticated, getAllPartnerCriteria);
router.get('/:id', authenticated, getPartnerCriteria);
router.put('/:id', authenticated, checkRole([1, 2]), updatePartnerCriteria);
router.delete('/:id', authenticated, checkRole([1, 2]), deletePartnerCriteria);

module.exports = router;
