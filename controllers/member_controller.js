const MemberService = require('../classes/MemberService');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/error_response');
const log4js = require('../config/log4js_config');
const logger = log4js.getLogger('memberController');
const Member = require('../classes/Members');

/**
 * Enhanced Member Controller
 * Handles all member-related routes with improved CRUD functionality
 */
const MemberController = {
    /**
     * @desc    Create a new member from LDAP
     * @route   POST /api/members
     * @access  Private (Admin, Super Admin)
     */
    createMember: asyncHandler(async (req, res, next) => {
        const { username } = req.body;

        if (!username) {
            return next(new ErrorResponse('Username is required', 400));
        }

        const newMember = await MemberService.createMember(username);

        res.status(201).json({
            success: true,
            data: newMember,
        });
    }),

    /**
     * @desc    Get a member by ID
     * @route   GET /api/members/:id
     * @access  Private
     */
    getMemberById: asyncHandler(async (req, res, next) => {
        const member = await MemberService.getMemberById(req.params.id);

        res.status(200).json({
            success: true,
            data: member,
        });
    }),

    /**
     * @desc    Update a member
     * @route   PUT /api/members/:id
     * @access  Private (Admin, Super Admin)
     */
    updateMember: asyncHandler(async (req, res, next) => {
        const member = await MemberService.updateMember(
            req.params.id,
            req.body
        );

        res.status(200).json({
            success: true,
            data: member,
        });
    }),

    /**
     * @desc    Delete a member (soft delete)
     * @route   DELETE /api/members/:id
     * @access  Private (Admin, Super Admin)
     */
    deleteMember: asyncHandler(async (req, res, next) => {
        await MemberService.deleteMember(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Member successfully deactivated',
        });
    }),

    /**
     * @desc    Get all members with optional filtering
     * @route   GET /api/members
     * @access  Private (Admin, Super Admin)
     */
    getAllMembers: asyncHandler(async (req, res, next) => {
        const filters = {
            status: req.query.status,
            role_id: req.query.role_id,
        };

        const members = await MemberService.getAllMembers(filters);

        res.status(200).json({
            success: true,
            count: members.length,
            data: members,
        });
    }),

    /**
     * @desc    Search members in LDAP
     * @route   POST /api/members/search
     * @access  Private
     */
    searchMembers: asyncHandler(async (req, res, next) => {
        const { username } = req.body;

        if (!username) {
            return next(
                new ErrorResponse('Username search pattern is required', 400)
            );
        }

        const results = await MemberService.searchMembers(username);

        res.status(200).json({
            success: true,
            count: results.length,
            data: results,
        });
    }),

    /**
     * @desc    Map all members hierarchically (Directors -> Managers -> Members)
     * @route   POST /api/members/map-hierarchy
     * @access  Private (Admin, Super Admin)
     */
    mapMembersHierarchy: asyncHandler(async (req, res, next) => {
        const result = await MemberService.mapMembersByHierarchy();

        res.status(200).json({
            success: true,
            message: 'Hierarchical member mapping completed',
            data: result,
        });
    }),

    /**
     * @desc    Hide popup for user
     * @route   POST /api/members/hide-popup
     * @access  Private
     */
    hidePopup: asyncHandler(async (req, res, next) => {
        const { member_employee_id } = req.userData;

        try {
            await Member.hidePopup(member_employee_id);
            res.status(200).json({
                success: true,
                message: 'Popup hidden successfully',
            });
        } catch (error) {
            logger.error(`Error hiding popup: ${error.message}`);
            return next(
                new ErrorResponse(`Failed to hide popup: ${error.message}`, 500)
            );
        }
    }),

    /**
     * @desc    Get members by role ID
     * @route   GET /api/members/role/:role_id
     * @access  Private
     */
    getByRoleId: asyncHandler(async (req, res, next) => {
        const { role_id } = req.params;

        const members = await Member.findByRoleId(role_id);

        res.status(200).json({
            success: true,
            count: members.length,
            data: members,
        });
    }),

    /**
     * @desc    Get members managed by current user
     * @route   GET /api/members/by-manager
     * @access  Private (Managers)
     */
    getByCurrentManager: asyncHandler(async (req, res, next) => {
        const { employee_id } = req.userData;

        const members = await Member.findByManagerId(employee_id);

        res.status(200).json({
            success: true,
            count: members.length,
            data: members,
        });
    }),

    /**
     * @desc    Get members directed by current user
     * @route   GET /api/members/by-director
     * @access  Private (Directors)
     */
    getByCurrentDirector: asyncHandler(async (req, res, next) => {
        const { employee_id } = req.userData;

        const members = await Member.findByDirectorId(employee_id);

        res.status(200).json({
            success: true,
            count: members.length,
            data: members,
        });
    }),
};

module.exports = MemberController;
