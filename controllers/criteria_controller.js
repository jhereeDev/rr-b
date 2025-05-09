const { Criteria, CriteriaTableSchema } = require('../classes/Criteria');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/error_response');
const log4js = require('../config/log4js_config');
const logger = log4js.getLogger('criteriaController'); // Logger for auth controller

// @desc    Add a new criteria
// @route   POST /api/criteria?role=member
// @access  Private
const addCriteria = asyncHandler(async (req, res, next) => {
    const { role } = req.query;

    let mappedData;
    if (role === 'leader') {
        mappedData = await Criteria.addManagerCriterias(req);
    } else if (role === 'partner') {
        mappedData = await Criteria.addCriterias(req);
    } else {
        return next(new ErrorResponse(`Criteria role must be provided`, 404));
    }

    res.json({ success: true, data: mappedData });
});

// @desc    Get all criteria
// @route   GET /api/criteria
// @access  Private
const getAllCriteria = asyncHandler(async (req, res, next) => {
    const { role_id, member_title } = req.userData;
    const isManager = role_id === 5;
    let isDelivery = isManager
        ? member_title.toLowerCase().includes('delivery')
        : false;

    const criteria = await Criteria.findAll(isManager, isDelivery);

    res.json({ success: true, data: criteria });
});

// // @desc    Get all criteria guidelines
// // @route   GET /api/criteria/guidelines
// // @access  Private
// const getAllCriteriaGuidelines = asyncHandler(async (req, res, next) => {
//     const { role_id } = req.userData;
//     const isManager = role_id === 5;

//     const criteria = await Criteria.findAllGuidelines(isManager);

//     res.json({ success: true, data: criteria });
// });

// @desc    Get a criteria
// @route   GET /api/criteria/:id
// @access  Private
const getCriteria = asyncHandler(async (req, res, next) => {
    const { role_id } = req.userData;
    const isManager = role_id === 5;

    const criteria = await Criteria.find(req.params.id, isManager);

    if (!criteria) {
        logger.error(`Criteria not found with id of ${req.params.id}`);
        return next(
            new ErrorResponse(
                `Criteria not found with id of ${req.params.id}`,
                404
            )
        );
    }

    res.json({ success: true, data: criteria });
});

// @desc    Update a criteria
// @route   PUT /api/criteria/:id
// @access  Private
// Not Completed
const updateCriteria = asyncHandler(async (req, res, next) => {
    const criteria = await Criteria.find(req.params.id);

    if (!criteria) {
        logger.error(`Criteria not found with id of ${req.params.id}`);

        return next(
            new ErrorResponse(
                `Criteria not found with id of ${req.params.id}`,
                404
            )
        );
    }

    const updatedCriteria = new Criteria({ ...criteria, ...req.body });

    const mappedData = await updatedCriteria.update();

    res.json({ success: true, data: mappedData });
});

// @desc    Delete a criteria
// @route   DELETE /api/criteria/:id
// @access  Private
// Not Completed
const deleteCriteria = asyncHandler(async (req, res, next) => {
    const criteria = await Criteria.find(req.params.id);

    if (!criteria) {
        logger.error(`Criteria not found with id of ${req.params.id}`);

        return next(
            new ErrorResponse(
                `Criteria not found with id of ${req.params.id}`,
                404
            )
        );
    }

    await criteria.delete();

    res.json({ success: true, data: {} });
});

// // @desc   Get all criteria by category
// // @route  GET /api/criteria/category/:category
// // @access Private
// const getCriteriaByCategory = asyncHandler(async (req, res, next) => {
//     const criteria = await Criteria.findByCategory(req.body.category);

//     res.json({ success: true, data: criteria });
// });

// @desc   Get all criteria by director approval
// @route  GET /api/criteria/director/:director
// @access Private
const getCriteriaByDirector = asyncHandler(async (req, res, next) => {
    const criteria = await Criteria.findByDirectorApproval(req.params.director);

    res.json({ success: true, data: criteria });
});

// PARTNER CRITERIA OPERATIONS

// @desc    Add a new criteria for partners via Excel upload
// @route   POST /api/criteria/partner/upload
// @access  Private (Admin, Super Admin)
const addPartnerCriterias = asyncHandler(async (req, res, next) => {
    try {
        const mappedData = await Criteria.addCriterias(req);
        res.status(201).json({ success: true, data: mappedData });
    } catch (error) {
        logger.error(`Error adding partner criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to add partner criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Add a single criteria for partners
// @route   POST /api/criteria/partner
// @access  Private (Admin, Super Admin)
const addPartnerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const {
            category,
            accomplishment,
            points,
            guidelines,
            director_approval,
            remarks,
            type,
        } = req.body;

        if (!category || !accomplishment || !points) {
            return next(
                new ErrorResponse(
                    'Please provide category, accomplishment and points',
                    400
                )
            );
        }

        const criteria = new Criteria({
            category,
            accomplishment,
            points: parseInt(points),
            guidelines,
            director_approval:
                director_approval === true || director_approval === 'true',
            type: type || 'BOTH',
            isManager: false,
            remarks,
        });

        await criteria.create();

        res.status(201).json({
            success: true,
            data: criteria,
        });
    } catch (error) {
        logger.error(`Error adding partner criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to add partner criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Get all partner criteria
// @route   GET /api/criteria/partner
// @access  Private
const getAllPartnerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const criteria = await Criteria.findAll(false);
        res.status(200).json({
            success: true,
            count: criteria.length,
            data: criteria,
        });
    } catch (error) {
        logger.error(`Error getting partner criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to retrieve partner criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Get a single partner criteria by ID
// @route   GET /api/criteria/partner/:id
// @access  Private
const getPartnerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const criteria = await Criteria.find(req.params.id, false);

        if (!criteria) {
            logger.error(
                `Partner criteria not found with id of ${req.params.id}`
            );
            return next(
                new ErrorResponse(
                    `Partner criteria not found with id of ${req.params.id}`,
                    404
                )
            );
        }

        res.status(200).json({ success: true, data: criteria });
    } catch (error) {
        logger.error(`Error getting partner criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to retrieve partner criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Update a partner criteria
// @route   PUT /api/criteria/partner/:id
// @access  Private (Admin, Super Admin)
const updatePartnerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const existingCriteria = await Criteria.find(req.params.id, false);

        if (!existingCriteria) {
            logger.error(
                `Partner criteria not found with id of ${req.params.id}`
            );
            return next(
                new ErrorResponse(
                    `Partner criteria not found with id of ${req.params.id}`,
                    404
                )
            );
        }

        const {
            category,
            accomplishment,
            points,
            guidelines,
            director_approval,
            remarks,
        } = req.body;

        const updateData = {
            id: req.params.id,
            category: category || existingCriteria.category,
            accomplishment: accomplishment || existingCriteria.accomplishment,
            points: points ? parseInt(points) : existingCriteria.points,
            guidelines:
                guidelines !== undefined
                    ? guidelines
                    : existingCriteria.guidelines,
            director_approval:
                director_approval !== undefined
                    ? director_approval === true || director_approval === 'true'
                    : existingCriteria.director_approval,
            isManager: false,
            remarks,
        };

        const criteria = new Criteria(updateData);
        await criteria.update();

        res.status(200).json({
            success: true,
            data: await Criteria.find(req.params.id, false),
        });
    } catch (error) {
        logger.error(`Error updating partner criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to update partner criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Delete a partner criteria
// @route   DELETE /api/criteria/partner/:id
// @access  Private (Admin, Super Admin)
const deletePartnerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const criteria = await Criteria.find(req.params.id, false);

        if (!criteria) {
            logger.error(
                `Partner criteria not found with id of ${req.params.id}`
            );
            return next(
                new ErrorResponse(
                    `Partner criteria not found with id of ${req.params.id}`,
                    404
                )
            );
        }

        const criteriaObj = new Criteria({
            id: req.params.id,
            isManager: false,
        });

        await criteriaObj.delete();

        res.status(200).json({
            success: true,
            data: {},
        });
    } catch (error) {
        logger.error(`Error deleting partner criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to delete partner criteria: ${error.message}`,
                500
            )
        );
    }
});

// PUBLISHED CRITERIA OPERATIONS

// @desc    Get all published partner criteria
// @route   GET /api/criteria/partner/published
// @access  Private
const getPublishedPartnerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const criteria = await Criteria.findPublished();

        res.status(200).json({
            success: true,
            count: criteria.length,
            data: criteria,
        });
    } catch (error) {
        logger.error(
            `Error getting published partner criteria: ${error.message}`
        );
        return next(
            new ErrorResponse(
                `Failed to retrieve published partner criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Get all draft partner criteria
// @route   GET /api/criteria/partner/drafts
// @access  Private (Admin, Super Admin)
const getDraftPartnerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const criteria = await Criteria.findDrafts(false);
        res.status(200).json({
            success: true,
            count: criteria.length,
            data: criteria,
        });
    } catch (error) {
        logger.error(`Error getting draft partner criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to retrieve draft partner criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Publish a single partner criteria
// @route   PUT /api/criteria/partner/:id/publish
// @access  Private (Admin, Super Admin)
const publishPartnerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const existingCriteria = await Criteria.find(req.params.id, false);

        if (!existingCriteria) {
            logger.error(
                `Partner criteria not found with id of ${req.params.id}`
            );
            return next(
                new ErrorResponse(
                    `Partner criteria not found with id of ${req.params.id}`,
                    404
                )
            );
        }

        const criteria = new Criteria({
            ...existingCriteria,
            id: req.params.id,
            isManager: false,
        });

        await criteria.publish();

        res.status(200).json({
            success: true,
            data: await Criteria.find(req.params.id, false),
        });
    } catch (error) {
        logger.error(`Error publishing partner criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to publish partner criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Publish all draft partner criteria
// @route   PUT /api/criteria/partner/publish-all
// @access  Private (Admin, Super Admin)
const publishAllPartnerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const count = await Criteria.publishAll(false);

        res.status(200).json({
            success: true,
            message: `${count} partner criteria published successfully`,
            count,
        });
    } catch (error) {
        logger.error(`Error publishing all partner criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to publish all partner criteria: ${error.message}`,
                500
            )
        );
    }
});

// MANAGER CRITERIA OPERATIONS

// @desc    Add new manager criteria via Excel upload
// @route   POST /api/criteria/manager/upload
// @access  Private (Admin, Super Admin)
const addManagerCriterias = asyncHandler(async (req, res, next) => {
    try {
        const mappedData = await Criteria.addManagerCriterias(req);
        res.status(201).json({ success: true, data: mappedData });
    } catch (error) {
        logger.error(`Error adding manager criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to add manager criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Add a single manager criteria
// @route   POST /api/criteria/manager
// @access  Private (Admin, Super Admin)
const addManagerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const {
            category,
            accomplishment,
            points,
            guidelines,
            director_approval,
            type,
            remarks,
        } = req.body;

        if (!category || !accomplishment || !points) {
            return next(
                new ErrorResponse(
                    'Please provide category, accomplishment and points',
                    400
                )
            );
        }

        const criteria = new Criteria({
            category,
            accomplishment,
            points: parseInt(points),
            guidelines,
            director_approval:
                director_approval === true || director_approval === 'true',
            type: type || 'BOTH',
            isManager: true,
            remarks,
        });

        await criteria.create();

        res.status(201).json({
            success: true,
            data: criteria,
        });
    } catch (error) {
        logger.error(`Error adding manager criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to add manager criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Get all manager criteria
// @route   GET /api/criteria/manager
// @access  Private
const getAllManagerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const { role_id, member_title } = req.userData;
        const isDelivery =
            member_title && member_title.toLowerCase().includes('delivery');

        const criteria = await Criteria.findAll(true, isDelivery);
        res.status(200).json({
            success: true,
            count: criteria.length,
            data: criteria,
        });
    } catch (error) {
        logger.error(`Error getting manager criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to retrieve manager criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Get a single manager criteria by ID
// @route   GET /api/criteria/manager/:id
// @access  Private
const getManagerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const criteria = await Criteria.find(req.params.id, true);

        if (!criteria) {
            logger.error(
                `Manager criteria not found with id of ${req.params.id}`
            );
            return next(
                new ErrorResponse(
                    `Manager criteria not found with id of ${req.params.id}`,
                    404
                )
            );
        }

        res.status(200).json({ success: true, data: criteria });
    } catch (error) {
        logger.error(`Error getting manager criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to retrieve manager criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Update a manager criteria
// @route   PUT /api/criteria/manager/:id
// @access  Private (Admin, Super Admin)
const updateManagerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const existingCriteria = await Criteria.find(req.params.id, true);

        if (!existingCriteria) {
            logger.error(
                `Manager criteria not found with id of ${req.params.id}`
            );
            return next(
                new ErrorResponse(
                    `Manager criteria not found with id of ${req.params.id}`,
                    404
                )
            );
        }

        const {
            category,
            accomplishment,
            points,
            guidelines,
            director_approval,
            type,
            remarks,
        } = req.body;

        const updateData = {
            id: req.params.id,
            category: category || existingCriteria.category,
            accomplishment: accomplishment || existingCriteria.accomplishment,
            points: points ? parseInt(points) : existingCriteria.points,
            guidelines:
                guidelines !== undefined
                    ? guidelines
                    : existingCriteria.guidelines,
            director_approval:
                director_approval !== undefined
                    ? director_approval === true || director_approval === 'true'
                    : existingCriteria.director_approval,
            type: type || existingCriteria.type || 'BOTH',
            isManager: true,
            remarks,
        };

        const criteria = new Criteria(updateData);
        await criteria.update();

        res.status(200).json({
            success: true,
            data: await Criteria.find(req.params.id, true),
        });
    } catch (error) {
        logger.error(`Error updating manager criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to update manager criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Delete a manager criteria
// @route   DELETE /api/criteria/manager/:id
// @access  Private (Admin, Super Admin)
const deleteManagerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const criteria = await Criteria.find(req.params.id, true);

        if (!criteria) {
            logger.error(
                `Manager criteria not found with id of ${req.params.id}`
            );
            return next(
                new ErrorResponse(
                    `Manager criteria not found with id of ${req.params.id}`,
                    404
                )
            );
        }

        const criteriaObj = new Criteria({
            id: req.params.id,
            isManager: true,
        });

        await criteriaObj.delete();

        res.status(200).json({
            success: true,
            data: {},
        });
    } catch (error) {
        logger.error(`Error deleting manager criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to delete manager criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Get all published manager criteria
// @route   GET /api/criteria/manager/published
// @access  Private
const getPublishedManagerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const { member_title } = req.userData;
        const isDelivery =
            member_title && member_title.toLowerCase().includes('delivery');

        const criteria = await Criteria.findPublished(true, isDelivery);
        res.status(200).json({
            success: true,
            count: criteria.length,
            data: criteria,
        });
    } catch (error) {
        logger.error(
            `Error getting published manager criteria: ${error.message}`
        );
        return next(
            new ErrorResponse(
                `Failed to retrieve published manager criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Get all draft manager criteria
// @route   GET /api/criteria/manager/drafts
// @access  Private (Admin, Super Admin)
const getDraftManagerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const criteria = await Criteria.findDrafts(true);
        res.status(200).json({
            success: true,
            count: criteria.length,
            data: criteria,
        });
    } catch (error) {
        logger.error(`Error getting draft manager criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to retrieve draft manager criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Publish a single manager criteria
// @route   PUT /api/criteria/manager/:id/publish
// @access  Private (Admin, Super Admin)
const publishManagerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const existingCriteria = await Criteria.find(req.params.id, true);

        if (!existingCriteria) {
            logger.error(
                `Manager criteria not found with id of ${req.params.id}`
            );
            return next(
                new ErrorResponse(
                    `Manager criteria not found with id of ${req.params.id}`,
                    404
                )
            );
        }

        const criteria = new Criteria({
            ...existingCriteria,
            id: req.params.id,
            isManager: true,
        });

        await criteria.publish();

        res.status(200).json({
            success: true,
            data: await Criteria.find(req.params.id, true),
        });
    } catch (error) {
        logger.error(`Error publishing manager criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to publish manager criteria: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Publish all draft manager criteria
// @route   PUT /api/criteria/manager/publish-all
// @access  Private (Admin, Super Admin)
const publishAllManagerCriteria = asyncHandler(async (req, res, next) => {
    try {
        const count = await Criteria.publishAll(true);

        res.status(200).json({
            success: true,
            message: `${count} manager criteria published successfully`,
            count,
        });
    } catch (error) {
        logger.error(`Error publishing all manager criteria: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to publish all manager criteria: ${error.message}`,
                500
            )
        );
    }
});

// SHARED OPERATIONS
// @desc    Get all criteria guidelines (both manager and partner)
// @route   GET /api/criteria/guidelines
// @access  Private
const getAllCriteriaGuidelines = asyncHandler(async (req, res, next) => {
    try {
        const { role_id } = req.userData;
        const isManager = role_id === 5;

        const criteria = await Criteria.findAllGuidelines(isManager);

        res.status(200).json({ success: true, data: criteria });
    } catch (error) {
        logger.error(`Error retrieving criteria guidelines: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to retrieve criteria guidelines: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Get criteria by category
// @route   POST /api/criteria/category
// @access  Private
const getCriteriaByCategory = asyncHandler(async (req, res, next) => {
    try {
        const { category } = req.body;
        const { role_id } = req.userData;
        const isManager = role_id === 5;

        if (!category) {
            return next(new ErrorResponse('Please provide a category', 400));
        }

        const criteria = await Criteria.findByCategory(category, isManager);

        res.status(200).json({
            success: true,
            count: criteria.length,
            data: criteria,
        });
    } catch (error) {
        logger.error(`Error retrieving criteria by category: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to retrieve criteria by category: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Get criteria by director approval
// @route   GET /api/criteria/director-approval/:status
// @access  Private
const getCriteriaByDirectorApproval = asyncHandler(async (req, res, next) => {
    try {
        const { status } = req.params;
        const { role_id } = req.userData;
        const isManager = role_id === 5;

        const criteria = await Criteria.findByDirectorApproval(
            status,
            isManager
        );

        res.status(200).json({
            success: true,
            count: criteria.length,
            data: criteria,
        });
    } catch (error) {
        logger.error(
            `Error retrieving criteria by director approval: ${error.message}`
        );
        return next(
            new ErrorResponse(
                `Failed to retrieve criteria by director approval: ${error.message}`,
                500
            )
        );
    }
});

// @desc    Get criteria by type (EXPERTS, DELIVERY, BOTH)
// @route   GET /api/criteria/type/:type
// @access  Private
const getCriteriaByType = asyncHandler(async (req, res, next) => {
    try {
        const { type } = req.params;
        const { role_id } = req.userData;
        const isManager = role_id === 5;
        const isAdmin = role_id === 1 || role_id === 2;

        if (!['EXPERTS', 'DELIVERY', 'BOTH'].includes(type.toUpperCase())) {
            return next(
                new ErrorResponse(
                    'Invalid type. Must be EXPERTS, DELIVERY, or BOTH',
                    400
                )
            );
        }

        const criteria = await Criteria.findByType(
            type.toUpperCase(),
            isManager || isAdmin
        );

        res.status(200).json({
            success: true,
            count: criteria.length,
            data: criteria,
        });
    } catch (error) {
        logger.error(`Error retrieving criteria by type: ${error.message}`);
        return next(
            new ErrorResponse(
                `Failed to retrieve criteria by type: ${error.message}`,
                500
            )
        );
    }
});

module.exports = {
    // addCriteria,
    // getAllCriteria,
    // getCriteria,
    // updateCriteria,
    // deleteCriteria,
    // getCriteriaByCategory,
    // getCriteriaByDirector,
    // getAllCriteriaGuidelines,

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
};
