const express = require('express');
const {
    addCriteria,
    getAllCriteria,
    getCriteria,
    updateCriteria,
    deleteCriteria,
    getCriteriaByCategory,
    getCriteriaByDirector,
    getAllCriteriaGuidelines,
} = require('../controllers/criteria_controller');
const { authenticated } = require('../middlewares/auth');
const multer = require('multer');

const router = express.Router();

// Multer configuration to keep the file in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', authenticated, upload.single('excelFile'), addCriteria);
router.get('/', authenticated, getAllCriteria);
router.get('/guidelines', authenticated, getAllCriteriaGuidelines);
router.post('/search/category', authenticated, getCriteriaByCategory);
router.get('/:id', authenticated, getCriteria);
router.put('/:id', authenticated, updateCriteria);
router.delete('/:id', authenticated, deleteCriteria);
router.get('/director/:director', authenticated, getCriteriaByDirector);

module.exports = router;
