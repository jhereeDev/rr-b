// controllers/member_controller.js
const MemberService = require('../classes/MemberService');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/error_response');
const log4js = require('../config/log4js_config');
const logger = log4js.getLogger('memberController');
const Member = require('../classes/Members');
const { Ldap } = require('../classes/Ldap');
const { LDAP_Connection } = require('../config/ldap_config');

/**
 * Enhanced Member Controller
 * Handles all member-related routes with improved CRUD functionality
 */
const MemberController = {
    /**
     * @desc    Create a new member from LDAP by email
     * @route   POST /api/members/by-email
     * @access  Private (Admin, Super Admin)
     */
    createMemberByEmail: asyncHandler(async (req, res, next) => {
        const { email, status } = req.body;

        // Validate required fields
        if (!email) {
            return next(new ErrorResponse('Email is required', 400));
        }

        if (!status || !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
            return next(new ErrorResponse('Valid status (ACTIVE or INACTIVE) is required', 400));
        }

        try {
            // Check if member already exists by email
            const existingMember = await Member.findByEmail(email);
            if (existingMember) {
                return next(new ErrorResponse('Member with this email already exists', 400));
            }

            // Connect to LDAP
            const LDAP_USERNAME = process.env.LDAP_USER;
            const LDAP_PASSWORD = process.env.LDAP_PASSWORD;
            const client = await LDAP_Connection(LDAP_USERNAME, LDAP_PASSWORD);

            if (!client) {
                logger.error('Failed to connect to LDAP server');
                return next(new ErrorResponse('Failed to connect to LDAP server', 500));
            }

            // Search for user in LDAP by email
            const result = await Ldap.searchByEmail(client, email);
            
            if (!result || result === 'No Record Found' || result === 'Search timeout') {
                client.unbind();
                logger.error(`No LDAP record found for email: ${email}`);
                return next(new ErrorResponse(`No LDAP record found for: ${email}`, 404));
            }

            // Get complete member information including manager and director
            const memberInfo = await Ldap.getMemberInfo(client, result.cn);
            client.unbind();

            if (!memberInfo || !memberInfo.member) {
                logger.error(`Failed to get complete member info for: ${email}`);
                return next(new ErrorResponse('Failed to get complete member information', 500));
            }

            // Set status from request
            memberInfo.member.member_status = status.toUpperCase();

            // Create new member in database
            const newMember = new Member(memberInfo.member);
            await newMember.create();

            // Create manager if not exists
            if (memberInfo.manager && memberInfo.manager.member_employee_id) {
                const existingManager = await Member.findByMemberId(memberInfo.manager.member_employee_id);
                if (!existingManager) {
                    const newManager = new Member(memberInfo.manager);
                    await newManager.create();
                    logger.info(`Created manager: ${memberInfo.manager.member_employee_id}`);
                }
            }

            // Create director if not exists
            if (memberInfo.director && memberInfo.director.member_employee_id) {
                const existingDirector = await Member.findByMemberId(memberInfo.director.member_employee_id);
                if (!existingDirector) {
                    const newDirector = new Member(memberInfo.director);
                    await newDirector.create();
                    logger.info(`Created director: ${memberInfo.director.member_employee_id}`);
                }
            }

            // Respond with success
            res.status(201).json({
                success: true,
                message: `Member ${memberInfo.member.member_firstname} ${memberInfo.member.member_lastname} created successfully`,
                data: newMember
            });
        } catch (error) {
            logger.error(`Error creating member by email: ${error.message}`, error);
            return next(new ErrorResponse(`Failed to create member: ${error.message}`, 500));
        }
    }),
    
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

    /**
     * @desc    Update member status
     * @route   PATCH /api/members/:id/status
     * @access  Private (Admin only)
     */
    updateMemberStatus: asyncHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            // Validate status
            if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
                return next(new ErrorResponse('Invalid status value', 400));
            }
            
            logger.info(`Attempting to update member status: ${id} - Status: ${status}`);
            
            // Check if member exists
            const member = await Member.findById(id);
            if (!member) {
                logger.error(`Member not found with id ${id} during status update attempt`);
                return next(new ErrorResponse(`Member not found with id ${id}`, 404));
            }
            
            // Update the member status
            const updatedMember = new Member({
                ...member,
                member_status: status
            });
            
            await updatedMember.update();
            
            logger.info(`Member status updated: ${id} - Status: ${status}`);
            
            res.status(200).json({
                success: true,
                message: `Member status updated to ${status}`,
                data: {
                    id,
                    status
                }
            });
        } catch (error) {
            logger.error(`Error updating member status for id ${req.params.id}: ${error.message}`);
            return next(new ErrorResponse(`Failed to update member status: ${error.message}`, 500));
        }
    })
};



module.exports = MemberController;