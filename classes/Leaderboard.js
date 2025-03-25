const { database } = require('../config/db_config');
const { Criteria } = require('./Criteria');
const RewardPoints = require('./RewardPoints');
const ErrorResponse = require('../utils/error_response');
const moment = require('moment');

// Define the Leaderboard class
class Leaderboard {
    static tableName = 'leaderboards';

    constructor({
        id,
        member_employee_id,
        alias_name,
        fiscal_year,
        total_points,
        approved_points,
        for_approval_points,
        rejected_points,
    }) {
        this.id = id;
        this.member_employee_id = member_employee_id;
        this.alias_name = alias_name;
        this.fiscal_year = fiscal_year;
        this.total_points = total_points;
        this.approved_points = approved_points;
        this.for_approval_points = for_approval_points;
        this.rejected_points = rejected_points;
    }

    static async findAll() {
        const query = database
            .from(this.tableName)
            .orderBy('total_points', 'desc');

        return this.joinWithMembers(query);
    }

    static async findById(id) {
        const query = database
            .from(this.tableName)
            .where('leaderboards.id', id)
            .first();

        return this.joinWithMembers(query);
    }

    static async findByEmployeeId(memberEmployeeId) {
        let query = database(this.tableName)
            .where('leaderboards.member_employee_id', memberEmployeeId)
            .first();

        return this.joinWithMembers(query);
    }

    static async findByRole(roleId, top = 10) {
        const query = database(this.tableName)
            .orderBy('leaderboards.total_points', 'desc')
            .limit(top);

        return this.joinWithMembers(query).where('members.role_id', roleId);
    }

    static async findByAliasName(aliasName) {
        const query = database
            .from(this.tableName)
            .where('leaderboards.alias_name', aliasName)
            .first();

        return this.joinWithMembers(query);
    }

    // Method to create a new leaderboard record
    async create() {
        const [id] = await database(Leaderboard.tableName).insert(this);
        this.id = id;
        return this;
    }

    async update() {
        return database(Leaderboard.tableName)
            .where('member_employee_id', this.member_employee_id)
            .update(this);
    }

    async addPoints(criteria_id, role_id) {
        const existingLeaderboard = await Leaderboard.findByEmployeeId(
            this.member_employee_id
        );
        if (!existingLeaderboard) {
            throw new ErrorResponse('Leaderboard record not found', 404);
        }

        const isManager = role_id === 5;
        const criteria = await Criteria.find(criteria_id, isManager);

        // Ensure points values are initialized with 0 instead of null/undefined
        const forApprovalPoints = existingLeaderboard.for_approval_points || 0;
        const approvedPoints = existingLeaderboard.approved_points || 0;
        const rejectedPoints = existingLeaderboard.rejected_points || 0;

        let newForApprovalPoints = forApprovalPoints;
        let newApprovedPoints = approvedPoints;

        // Special handling for role_id 6
        if (role_id === 6) {
            newForApprovalPoints = forApprovalPoints + criteria.points;
        } else {
            // Original logic for other roles
            if (criteria.director_approval) {
                newForApprovalPoints = forApprovalPoints + criteria.points;
            } else {
                newApprovedPoints = approvedPoints + criteria.points;
            }
        }

        const totalPoints =
            newForApprovalPoints + newApprovedPoints + rejectedPoints;

        return this.updatePoints({
            for_approval_points: newForApprovalPoints,
            approved_points: newApprovedPoints,
            total_points: totalPoints,
        });
    }

    async approvePoints(criteria_id, reward_entry_id, status) {
        const existingLeaderboard = await Leaderboard.findByEmployeeId(
            this.member_employee_id
        );
        if (!existingLeaderboard) {
            throw new ErrorResponse('Leaderboard record not found', 404);
        }

        const rewardEntry = await RewardPoints.findById(reward_entry_id);
        if (rewardEntry.member_employee_id !== this.member_employee_id) {
            throw new ErrorResponse(
                'Reward entry not eligible for point update',
                400
            );
        }

        const criteria = await Criteria.find(criteria_id);
        const rewardPoints = criteria.points;

        // Ensure all point values are initialized to 0 if null/undefined
        let forApprovalPoints = existingLeaderboard.for_approval_points || 0;
        let approvedPoints = existingLeaderboard.approved_points || 0;
        let rejectedPoints = existingLeaderboard.rejected_points || 0;

        // Validate there are enough points to subtract
        if (forApprovalPoints < rewardPoints) {
            // Log the inconsistency but use available points to avoid negative values
            console.error(
                `Inconsistent points data: Trying to subtract ${rewardPoints} points from ${forApprovalPoints} for_approval_points`
            );
            forApprovalPoints = 0;
        } else {
            forApprovalPoints -= rewardPoints;
        }

        if (status === 'approved') {
            approvedPoints += rewardPoints;
        } else if (status === 'rejected') {
            rejectedPoints += rewardPoints;
        }

        const totalPoints = forApprovalPoints + approvedPoints + rejectedPoints;

        return this.updatePoints({
            for_approval_points: forApprovalPoints,
            approved_points: approvedPoints,
            rejected_points: rejectedPoints,
            total_points: totalPoints,
        });
    }

    async resubmitPoints(criteria_id, reward_entry_id) {
        const existingLeaderboard = await Leaderboard.findByEmployeeId(
            this.member_employee_id
        );
        if (!existingLeaderboard) {
            throw new ErrorResponse('Leaderboard record not found', 404);
        }

        const rewardEntry = await RewardPoints.findById(reward_entry_id);
        if (rewardEntry.member_employee_id !== this.member_employee_id) {
            throw new ErrorResponse(
                'Reward entry not eligible for point update',
                400
            );
        }

        const criteria = await Criteria.find(criteria_id);
        const rewardPoints = criteria.points;

        // Ensure all point values are initialized to 0 if null/undefined
        let forApprovalPoints = existingLeaderboard.for_approval_points || 0;
        let approvedPoints = existingLeaderboard.approved_points || 0;
        let rejectedPoints = existingLeaderboard.rejected_points || 0;

        // Validate there are enough rejected points to subtract
        if (rejectedPoints < rewardPoints) {
            // Log the inconsistency but use available points to avoid negative values
            console.error(
                `Inconsistent points data: Trying to subtract ${rewardPoints} points from ${rejectedPoints} rejected_points`
            );
            rejectedPoints = 0;
        } else {
            rejectedPoints -= rewardPoints;
        }

        forApprovalPoints += rewardPoints;
        const totalPoints = forApprovalPoints + approvedPoints + rejectedPoints;

        return this.updatePoints({
            for_approval_points: forApprovalPoints,
            rejected_points: rejectedPoints,
            total_points: totalPoints,
        });
    }

    async updatePoints(updateData) {
        // Ensure no negative values are saved to the database
        Object.keys(updateData).forEach((key) => {
            if (typeof updateData[key] === 'number' && updateData[key] < 0) {
                console.error(
                    `Attempted to update ${key} with negative value: ${updateData[key]}`
                );
                updateData[key] = 0;
            }
        });

        return database(Leaderboard.tableName)
            .where('member_employee_id', this.member_employee_id)
            .update({
                ...updateData,
                updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
            });
    }

    static joinWithMembers(query) {
        const memberFields = [
            'members.member_employee_id',
            'members.member_firstname',
            'members.member_lastname',
            'members.member_email',
            'members.role_id',
            'members.member_title',
            'members.member_manager_id',
            'members.member_director_id',
            'members.member_status',
            'members.created_at',
            'members.updated_at',
        ];

        return query
            .select('leaderboards.*', ...memberFields)
            .join(
                'members',
                'leaderboards.member_employee_id',
                '=',
                'members.member_employee_id'
            );
    }
}

module.exports = Leaderboard;
