const { database } = require('../config/db_config');
const xlsx = require('xlsx');
const { boolean, booleanToNumber } = require('../utils/helpers');

// Define the Criteria class
class Criteria {
    constructor({
        id,
        category,
        accomplishment,
        points,
        guidelines,
        director_approval,
        type = 'BOTH', // New field: BOTH, EXPERTS, DELIVERY
        isManager = false,
        published = false, // New field: published status
    }) {
        // Initialize the object properties
        this.id = id;
        this.category = category;
        this.accomplishment = accomplishment;
        this.points = points;
        this.guidelines = guidelines;
        this.director_approval = director_approval;
        this.type = type;
        this.isManager = isManager;
        this.published = published;
    }

    static get memberTableName() {
        return 'rewardpointscriteria';
    }

    static get managerTableName() {
        return 'managerrewardpointscriteria';
    }

    // Get tableName based on isManager flag
    getTableName() {
        return this.isManager
            ? Criteria.managerTableName
            : Criteria.memberTableName;
    }

    static async findAll(
        isManager = false,
        isDelivery = false,
        guidelines = false,
        publishedStatus = null
    ) {
        const tableName = isManager
            ? this.managerTableName
            : this.memberTableName;

        let query = database(tableName);

        // Filter by published status if provided
        if (publishedStatus !== null) {
            query = query.where('published', publishedStatus);
        }

        if (!guidelines) {
            if (isManager) {
                if (isDelivery) {
                    query = query.where(function () {
                        this.where('type', 'DELIVERY').orWhere('type', 'BOTH');
                    });
                } else {
                    query = query.where(function () {
                        this.where('type', 'EXPERTS').orWhere('type', 'BOTH');
                    });
                }
            }
        }

        return await query;
    }

    static async findAllGuidelines(isManager = false) {
        const tableName = isManager
            ? this.managerTableName
            : this.memberTableName;
        return await database(tableName);
    }

    // Method to add criterias to the database in bulk from Excel
    static async addCriterias(req) {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); // Read directly from buffer
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const mappedData = sheetData.map((row) => ({
            id: row['id'] || null,
            category: row['category'],
            accomplishment: row['accomplishment'],
            points: parseInt(row['points']),
            guidelines: row['guidelines'],
            director_approval: boolean(row['director_approval']),
            type: row['type'] || 'BOTH',
        }));

        // Insert data into the member criteria table
        await database(this.memberTableName).insert(mappedData);

        return mappedData;
    }

    // Method to add criterias to the manager/leaders database in bulk from Excel
    static async addManagerCriterias(req) {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); // Read directly from buffer
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const mappedData = sheetData.map((row) => ({
            id: row['id'] || null,
            category: row['category'],
            accomplishment: row['accomplishment'],
            points: parseInt(row['points']),
            guidelines: row['guidelines'],
            director_approval: boolean(row['director_approval']),
            type: row['type'] || 'BOTH',
        }));

        // Insert data into the manager criteria table
        await database(this.managerTableName).insert(mappedData);

        return mappedData;
    }

    // Method to create a single new criteria
    async create() {
        const tableName = this.getTableName();

        // Create a clean object with only the fields that should be in the database
        const criteriaData = {
            category: this.category,
            accomplishment: this.accomplishment,
            points: this.points,
            guidelines: this.guidelines,
            director_approval: this.director_approval,
            published: this.published || false, // Default to false if not provided
        };

        // Only add type field if isManager is true
        if (this.isManager) {
            criteriaData.type = this.type || 'BOTH';
        }

        // Insert and return the ID
        const [id] = await database(tableName).insert(criteriaData);
        this.id = id;

        return this;
    }

    // Method to update an existing criteria
    async update() {
        const tableName = this.getTableName();

        if (!this.id) {
            throw new Error('Cannot update criteria without an ID');
        }

        // Create a clean object with only the fields that should be updated
        const criteriaData = {
            category: this.category,
            accomplishment: this.accomplishment,
            points: this.points,
            guidelines: this.guidelines,
            director_approval: this.director_approval,
        };

        // Add published field if it's defined
        if (this.published !== undefined) {
            criteriaData.published = this.published;
        }

        // Only add type field if isManager is true
        if (this.isManager) {
            criteriaData.type = this.type || 'BOTH';
        }

        // Remove undefined values
        Object.keys(criteriaData).forEach((key) => {
            if (criteriaData[key] === undefined) delete criteriaData[key];
        });

        await database(tableName).where('id', this.id).update(criteriaData);

        return this;
    }

    // Method to delete an existing criteria
    async delete() {
        const tableName = this.getTableName();

        if (!this.id) {
            throw new Error('Cannot delete criteria without an ID');
        }

        return await database(tableName).where('id', this.id).del();
    }

    // Method to find a criteria by ID
    static async find(id, isManager = false) {
        const tableName = isManager
            ? this.managerTableName
            : this.memberTableName;
        return await database(tableName).where('id', id).first();
    }

    // Method to retrieve criteria by category
    static async findByCategory(category, isManager = false) {
        const tableName = isManager
            ? this.managerTableName
            : this.memberTableName;
        return await database(tableName).where('category', category);
    }

    // Method to retrieve criteria by director approval
    static async findByDirectorApproval(director_approval, isManager = false) {
        const tableName = isManager
            ? this.managerTableName
            : this.memberTableName;
        return await database(tableName).where(
            'director_approval',
            booleanToNumber(director_approval)
        );
    }

    // Method to retrieve criteria by type (EXPERTS, DELIVERY, BOTH)
    static async findByType(type, isManager = false) {
        if (!isManager) {
            return next(
                new ErrorResponse(
                    'You are not authorized to view criteria by type',
                    403
                )
            );
        }
        const tableName = this.managerTableName;

        return await database(tableName)
            .where('type', type)
            .orWhere('type', 'BOTH');
    }

    // Method to find all published criteria
    static async findPublished(isManager = false, isDelivery = false) {
        return await this.findAll(isManager, isDelivery, false, true);
    }

    // Method to find all draft criteria
    static async findDrafts(isManager = false, isDelivery = false) {
        return await this.findAll(isManager, isDelivery, false, false);
    }

    // Method to publish a single criteria
    async publish() {
        this.published = true;
        return await this.update();
    }

    // Static method to publish all draft criteria
    static async publishAll(isManager = false) {
        const tableName = isManager
            ? this.managerTableName
            : this.memberTableName;

        return await database(tableName)
            .where('published', false)
            .update({ published: true });
    }
}

// Define the CriteriaTable Schema class
class CriteriaTableSchema {
    // Define table schema properties
    constructor() {
        // Define table schema properties
        const table = 'rewardpointscriteria';
        const id = 'id';
        const category = 'category';
        const accomplishment = 'accomplishment';
        const points = 'points';
        const guidelines = 'guidelines';
        const director_approval = 'director_approval';
        const type = 'type';
        const published = 'published';
        const alias = {
            id: 'id',
            category: 'category',
            accomplishment: 'accomplishment',
            points: 'points',
            guidelines: 'guidelines',
            director_approval: 'director_approval',
            type: 'type',
            published: 'published',
        };

        // Define getter methods for the table schema properties
        this.getTable = () => table;
        this.getId = () => id;
        this.getCategory = () => category;
        this.getAccomplishment = () => accomplishment;
        this.getPoints = () => points;
        this.getGuidelines = () => guidelines;
        this.getDirectorApproval = () => director_approval;
        this.getType = () => type;
        this.getPublished = () => published;
        this.get_alias = function () {
            return Object.keys(alias).map((key) => `${key} as ${alias[key]}`);
        };
        this.get_key_value = function (key, value) {
            let obj = {};
            obj[key] = value;
            return obj;
        };
    }
}

// Export the Criteria class
module.exports = {
    Criteria,
    CriteriaTableSchema,
};
