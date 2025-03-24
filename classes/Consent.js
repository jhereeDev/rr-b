const { database } = require('../config/db_config');

class ConsentService {
  static get tableName() {
    return 'consent_logs';
  }

  async logConsent(member_employee_id, consentData) {
    const {
      internal_publication_consent,
      personal_data_consent,
      rewards_management_consent,
    } = consentData;

    try {
      // Check if consent already exists
      const existingConsent = await database(ConsentService.tableName)
        .where('member_employee_id', member_employee_id)
        .first();

      if (existingConsent) {
        // Update existing consent
        return await database(ConsentService.tableName)
          .where('member_employee_id', member_employee_id)
          .update({
            internal_publication_consent,
            personal_data_consent,
            rewards_management_consent,
            updated_at: database.fn.now(),
          });
      }

      // Create new consent log
      const [id] = await database(ConsentService.tableName).insert({
        member_employee_id,
        internal_publication_consent,
        personal_data_consent,
        rewards_management_consent,
      });

      return id;
    } catch (error) {
      console.error('Error in ConsentService.logConsent:', error);
      throw new Error(`Error logging consent: ${error.message}`);
    }
  }

  async getConsentStatus(member_employee_id) {
    try {
      const consent = await database(ConsentService.tableName)
        .where('member_employee_id', member_employee_id)
        .first();

      return (
        consent || {
          internal_publication_consent: false,
          personal_data_consent: false,
          rewards_management_consent: false,
        }
      );
    } catch (error) {
      console.error('Error in ConsentService.getConsentStatus:', error);
      throw new Error(`Error fetching consent status: ${error.message}`);
    }
  }

  async getAllConsent() {
    try {
      const query = database(ConsentService.tableName)
        .select(
          'consent_logs.id as consent_id',
          'consent_logs.*',
          'members.member_employee_id',
          'members.member_firstname',
          'members.member_lastname',
          'members.member_email',
          'members.member_title'
        )
        .join(
          'members',
          'consent_logs.member_employee_id',
          '=',
          'members.member_employee_id'
        )
        .orderBy('consent_logs.created_at', 'desc');

      const consents = await query;

      return consents.map((consent) => ({
        id: consent.consent_id,
        member_info: {
          member_employee_id: consent.member_employee_id,
          member_firstname: consent.member_firstname,
          member_lastname: consent.member_lastname,
          member_email: consent.member_email,
          member_title: consent.member_title,
        },
        consent_data: {
          internal_publication_consent:
            consent.internal_publication_consent === 1 ? true : false,
          personal_data_consent:
            consent.personal_data_consent === 1 ? true : false,
          rewards_management_consent:
            consent.rewards_management_consent === 1 ? true : false,
        },
        created_at: consent.created_at,
        updated_at: consent.updated_at,
      }));
    } catch (error) {
      console.error('Error in ConsentService.getAllConsent:', error);
      throw new Error(`Error fetching consent status: ${error.message}`);
    }
  }
}

module.exports = new ConsentService();
