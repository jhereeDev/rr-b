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
        isManager = false,
    }) {
        // Initialize the object properties
        this.id = id;
        this.category = category;
        this.accomplishment = accomplishment;
        this.points = points;
        this.guidelines = guidelines;
        this.director_approval = director_approval;
        this.isManager = isManager;
    }

    static get memberTableName() {
        return 'rewardpointscriteria';
    }

    static get managerTableName() {
        return 'managerrewardpointscriteria';
    }

    static async findAll(
        isManager = false,
        isDelivery = false,
        guidelines = false
    ) {
        const tableName = isManager
            ? this.managerTableName
            : this.memberTableName;

        let query = database(tableName);

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

    // Method to add criterias to the database in bulk
    static async addCriterias(req) {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); // Read directly from buffer
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const mappedData = sheetData.map((row) => ({
            id: row['id'],
            category: row['category'],
            accomplishment: row['accomplishment'],
            points: row['points'],
            guidelines: row['guidelines'],
            director_approval: boolean(row['director_approval']),
        }));

        // mapped data and add to database
        const table = new CriteriaTableSchema().getTable();
        await database(table).insert(mappedData);

        return mappedData;
    }

    // Method to add criterias to the manager/leaders database in bulk
    static async addManagerCriterias(req) {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); // Read directly from buffer
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const mappedData = sheetData.map((row) => ({
            id: row['id'],
            category: row['category'],
            accomplishment: row['accomplishment'],
            points: row['points'],
            guidelines: row['guidelines'],
            director_approval: boolean(row['director_approval']),
        }));

        // mapped data and add to database
        await database(this.managerTableName).insert(mappedData);

        return mappedData;
    }

    // Method to create a new criteria in the database
    async create() {
        const table = new CriteriaTableSchema().getTable();
        const data = Object.keys(this).map((key) => this[key]);
        Object.keys(data).map((key) => {
            if (data[key] === undefined) {
                data[key] = null;
            }
        });

        return database(table).insert(this);
    }

    // Method to update an existing criteria in the database
    async update() {
        const table = new CriteriaTableSchema().getTable();
        const id = new CriteriaTableSchema().getId();
        const data = Object.keys(this).map((key) => this[key]);
        Object.keys(data).map((key) => {
            if (data[key] === undefined) {
                data[key] = null;
            }
        });

        return database(table).where(id, this.id).update(this);
    }

    // Method to delete an existing criteria from the database
    async delete() {
        const table = new CriteriaTableSchema().getTable();
        const id = new CriteriaTableSchema().getId();

        return database(table).where(id, this.id).del();
    }

    static async find(id, isManager = false) {
        const tableName = isManager
            ? this.managerTableName
            : this.memberTableName;
        return await database(tableName).where('id', id).first();
    }
    // Method to retrieve a criteria by category from the database
    static async findByCategory(category) {
        const options = new CriteriaTableSchema();
        const table = options.getTable();
        const categoryKey = options.getCategory();

        const criterias = database
            .select('*')
            .from(table)
            .where(options.get_key_value(categoryKey, category));

        return criterias;
    }

    // Method to retrieve a criteria by director approval from the database
    static async findByDirectorApproval(director_approval) {
        const table = new CriteriaTableSchema().getTable();
        // const alias = new CriteriaTableSchema().get_alias();
        const directorApprovalKey =
            new CriteriaTableSchema().getDirectorApproval();

        return database
            .select('*')
            .from(table)
            .where(directorApprovalKey, booleanToNumber(director_approval));
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
        const alias = {
            id: 'id',
            category: 'category',
            accomplishment: 'accomplishment',
            points: 'points',
            guidelines: 'guidelines',
            director_approval: 'director_approval',
        };

        // Define getter methods for the table schema properties
        this.getTable = () => table;
        this.getId = () => id;
        this.getCategory = () => category;
        this.getAccomplishment = () => accomplishment;
        this.getPoints = () => points;
        this.getGuidelines = () => guidelines;
        this.getDirectorApproval = () => director_approval;
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
