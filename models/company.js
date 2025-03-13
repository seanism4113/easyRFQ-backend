"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
	/** Create a company (from data), update db, return new company data.
	 *
	 * data should be { name, addressLine1, addressLine2, city, state, country, phoneMain }
	 *
	 * Returns { id, name, addressLine1, addressLine2, city, state, country, phoneMain }
	 *
	 * Throws BadRequestError if company already exists in the database.
	 */

	static async create({ name, addressLine1, addressLine2, city, state, country, phoneMain }) {
		const duplicateCheck = await db.query(
			`SELECT name
       FROM companies
       WHERE name = $1`,
			[name]
		);

		if (duplicateCheck.rows[0]) throw new BadRequestError(`Duplicate company: ${name}`);

		const result = await db.query(
			`INSERT INTO companies
       (name, address_line1, address_line2, city, state, country, phone_main)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, address_line1 AS "addressLine1", address_line2 AS "addressLine2", city, state, country, phone_main AS "phoneMain"`,
			[name, addressLine1, addressLine2, city, state, country, phoneMain]
		);
		const company = result.rows[0];

		return company;
	}

	/** Find all companies (optional filter on searchFilters).
	 *
	 * Returns [{ id, name, addressLine1, addressLine2, city, state, country, phoneMain }, ...]
	 *
	 * Optionally filter the list of companies by `name` field.
	 */
	static async findAll(searchFilters = {}) {
		let query = `SELECT id, name,
                        address_line1 AS "addressLine1",
                        address_line2 AS "addressLine2",
                        city,
                        state,
                        country,
                        phone_main AS "phoneMain"
                 FROM companies`;
		let whereExpressions = [];
		let queryValues = [];

		const { name } = searchFilters;

		if (name) {
			queryValues.push(`%${name}%`);
			whereExpressions.push(`name ILIKE $${queryValues.length}`);
		}

		if (whereExpressions.length > 0) {
			query += " WHERE " + whereExpressions.join(" AND ");
		}

		query += " ORDER BY name";
		const companiesRes = await db.query(query, queryValues);
		return companiesRes.rows;
	}

	/** Given a company id, return data about the company.
	 *
	 * Throws NotFoundError if the company is not found.
	 */

	static async get(companyId) {
		const companyRes = await db.query(
			`SELECT id, name,
              address_line1 AS "addressLine1",
              address_line2 AS "addressLine2",
              city,
              state,
              country,
              phone_main AS "phoneMain"
       FROM companies
       WHERE id = $1`,
			[companyId]
		);

		const company = companyRes.rows[0];

		if (!company) throw new NotFoundError(`No company with ID: ${companyId}`);

		return company;
	}

	/** Get a company by its name.
	 *
	 * Throws NotFoundError if the company is not found.
	 */

	static async getByName(name) {
		const companyRes = await db.query(
			`SELECT id, name,
				  address_line1 AS "addressLine1",
				  address_line2 AS "addressLine2",
				  city,
				  state,
				  country,
				  phone_main AS "phoneMain"
		   FROM companies
		   WHERE name = $1`,
			[name]
		);

		const company = companyRes.rows[0];

		if (!company) throw new NotFoundError(`No company found with name: ${name}`);

		return company;
	}

	/** Update company data with `data`.
	 *
	 * Data can include: {addressLine1, addressLine2, city, state, country, phoneMain}
	 *
	 * Returns {id, name, addressLine1, addressLine2, city, state, country, phoneMain}
	 *
	 * Throws NotFoundError if company is not found.
	 */

	static async update(companyId, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {
			addressLine1: "address_line1",
			addressLine2: "address_line2",
			city: "city",
			state: "state",
			country: "country",
			phoneMain: "phone_main",
		});
		const companyIdVarIdx = "$" + (values.length + 1);

		const querySql = `UPDATE companies
                      SET ${setCols}
                      WHERE id = ${companyIdVarIdx}
                      RETURNING id, name,
                                address_line1 AS "addressLine1",
                                address_line2 AS "addressLine2",
                                city,
                                state,
                                country,
                                phone_main AS "phoneMain"`;
		const result = await db.query(querySql, [...values, companyId]);
		const company = result.rows[0];

		if (!company) throw new NotFoundError(`No company with ID: ${companyId}`);

		return company;
	}

	/** Delete given company from database; returns undefined.
	 *
	 * Throws NotFoundError if company not found.
	 */

	static async remove(companyId) {
		const result = await db.query(
			`DELETE
       FROM companies
       WHERE id = $1
       RETURNING id`,
			[companyId]
		);
		const company = result.rows[0];

		if (!company) throw new NotFoundError(`No company with ID: ${companyId}`);

		return { message: "Deleted successfully" };
	}

	/**
	 * Adds a customer to the company_customers table.
	 * @param {number} companyId - The ID of the company
	 * @param {number} customerId - The ID of the customer
	 * @returns {object} { companyId, customerId }
	 */
	static async addCustomer(companyId, customerId) {
		// Check if the company and customer exist
		const checkResult = await db.query(
			`SELECT c.id AS company_id, cu.id AS customer_id
       FROM companies c, company_customers cu
       WHERE c.id = $1 AND cu.customer_id = $2`,
			[companyId, customerId]
		);

		if (checkResult.rows.length > 0) {
			const { company_id, customer_id } = checkResult.rows[0];
			if (company_id === customer_id) {
				throw new BadRequestError("A company cannot be its own customer.");
			}
		} else {
			throw new NotFoundError("Company or customer not found.");
		}

		// Insert into company_customers if validation passes
		const result = await db.query(
			`INSERT INTO company_customers (company_id, customer_id)
       VALUES ($1, $2)
       RETURNING company_id AS "companyId", customer_id AS "customerId"`,
			[companyId, customerId]
		);

		return result.rows[0];
	}

	/**
	 * Adds an item to the company_items table.
	 * @param {number} companyId - The ID of the company
	 * @param {number} itemCode - The code of the item
	 * @returns {object} { companyId, itemCode }
	 */
	static async addItem(companyId, itemCode) {
		const result = await db.query(
			`INSERT INTO company_items (company_id, item_code)
       VALUES ($1, $2)
       RETURNING company_id AS "companyId", item_code AS "itemCode"`,
			[companyId, itemCode]
		);
		return result.rows[0];
	}

	/** Get company directory (company info and all users).
	 *
	 * Returns { company: { id, name, addressLine1, addressLine2, city, state, country, phoneMain }, users: [{id, name, email, phone}, ...] }
	 *
	 * Throws NotFoundError if company not found.
	 */
	static async getDirectory(companyId) {
		// Fetch company information
		const companyRes = await db.query(
			`SELECT id, name, address_line1 AS "addressLine1",
              address_line2 AS "addressLine2", city, state, country, phone_main AS "phoneMain"
       FROM companies
       WHERE id = $1`,
			[companyId]
		);

		const company = companyRes.rows[0];

		if (!company) throw new NotFoundError(`No company with ID: ${companyId}`);

		// Fetch users associated with the company
		const usersRes = await db.query(
			`SELECT id, full_name AS "fullName", email, phone, is_admin AS "isAdmin"
       FROM users
       WHERE company_id = $1`,
			[companyId]
		);

		const users = usersRes.rows;

		return { company, users };
	}
}

module.exports = Company;
