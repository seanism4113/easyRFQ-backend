"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for customers. */

class Customer {
	/** Create a customer (from data), update db, return new customer data.
	 *
	 * data should be { company_id, customer_name, markup_type, markup, address_line1, address_line2, city, state, country, phone_main }
	 *
	 * Returns { company_id, customer_name, markup_type, markup, address_line1, address_line2, city, state, country, phone_main }
	 *
	 * Throws BadRequestError if customer already exists in the database for the given company.
	 */
	static async create({ company_id, customer_name, address_line1, address_line2, city, state, country, phone_main, markup_type, markup }) {
		// Check for duplicates based on company_id and customer_name
		const duplicateCheck = await db.query(
			`SELECT customer_name
             FROM company_customers
             WHERE company_id = $1 AND customer_name = $2`,
			[company_id, customer_name]
		);

		if (duplicateCheck.rows[0]) throw new BadRequestError(`Duplicate customer: ${customer_name}`);

		const result = await db.query(
			`INSERT INTO company_customers
             (company_id, customer_name, address_line1, address_line2, city, state, country, phone_main, markup_type, markup)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING company_id AS "companyId", customer_name AS "customerName", address_line1 AS "addressLine1", address_line2 AS "addressLine2", city, state, country, phone_main AS "phoneMain", markup_type AS "markupType", markup`,
			[company_id, customer_name, address_line1, address_line2, city, state, country, phone_main, markup_type, markup]
		);
		const customer = result.rows[0];

		return customer;
	}

	/** Find all customers for a company (optional filter on searchFilters).
	 *
	 * Returns [{ company_id, customer_name, markup_type, markup }, ...]
	 *
	 * Optional searchFilters can include a name filter to narrow the results.
	 */
	static async findAll(companyId, searchFilters = {}) {
		let query = `SELECT c.company_id AS "companyId",
                            c.customer_name AS "customerName",
                            c.address_line1 AS "addressLine1",
                            c.address_line2 AS "addressLine2",
                            c.city,
                            c.state,
                            c.country,
                            c.phone_main AS "phoneMain",
                            c.markup_type AS "markupType",
                            c.markup
                     FROM company_customers c
                     WHERE c.company_id = $1`;

		let queryValues = [companyId]; // Add company_id as the first query value

		const { name } = searchFilters;

		// If a name filter is provided, add it to the WHERE clause
		if (name) {
			queryValues.push(`%${name}%`);
			query += ` AND c.customer_name ILIKE $${queryValues.length}`; // Filter customers by name
		}

		query += " ORDER BY c.customer_name"; // Sort by customer name

		const customersRes = await db.query(query, queryValues);
		return customersRes.rows;
	}

	/** Given a customer name and company_id, return data about customer.
	 *
	 * Throws NotFoundError if customer not found in the specified company.
	 */
	static async get(companyId, customerName) {
		const customerRes = await db.query(
			`SELECT company_id AS "companyId",
                    customer_name AS "customerName",
                    address_line1 AS "addressLine1",
                    address_line2 AS "addressLine2",
                    city,
                    state,
                    country,
                    phone_main AS "phoneMain",
                    markup_type AS "markupType",
                    markup
             FROM company_customers
             WHERE company_id = $1 AND customer_name = $2`,
			[companyId, customerName]
		);

		const customer = customerRes.rows[0];

		if (!customer) throw new NotFoundError(`No customer: ${customerName}`);

		return customer;
	}

	/** Update customer data with `data`.
	 *
	 * This is a "partial update" --- only provided fields will be updated.
	 *
	 * Data can include: { customer_name, markup_type, markup, address_line1, address_line2, city, state, country, phone_main }
	 *
	 * Returns { company_id, customer_name, markup_type, markup, address_line1, address_line2, city, state, country, phone_main }
	 *
	 * Throws NotFoundError if customer not found for the given company.
	 */
	static async update(companyId, customerName, data) {
		try {
			// Use sqlForPartialUpdate to generate the SQL columns and values for partial update
			const { setCols, values } = sqlForPartialUpdate(data, {
				customerName: "customer_name",
				addressLine1: "address_line1",
				addressLine2: "address_line2",
				city: "city",
				state: "state",
				country: "country",
				phoneMain: "phone_main",
				markupType: "markup_type",
				markup: "markup",
			});

			// Prepare query with positional indexes for parameters
			const companyIdVarIdx = "$" + (values.length + 1);
			const customerNameVarIdx = "$" + (values.length + 2);

			const querySql = `UPDATE company_customers
                              SET ${setCols}
                              WHERE company_id = ${companyIdVarIdx} AND customer_name = ${customerNameVarIdx}
                              RETURNING company_id AS "companyId", 
                                        customer_name AS "customerName", 
                                        address_line1 AS "addressLine1", 
                                        address_line2 AS "addressLine2", 
                                        city, 
                                        state, 
                                        country, 
                                        phone_main AS "phoneMain", 
                                        markup_type AS "markupType",
                                        markup`;

			// Execute the query and return the updated customer
			const result = await db.query(querySql, [...values, companyId, customerName]);
			const customer = result.rows[0];

			if (!customer) throw new NotFoundError(`No customer: ${customerName}`);

			return customer;
		} catch (err) {
			console.error("Error updating customer:", err);
			throw err;
		}
	}

	/** Delete given customer from the database.
	 *
	 * Returns a message indicating successful deletion.
	 *
	 * Throws NotFoundError if customer not found for the given company.
	 */
	static async remove(companyId, customerName) {
		const result = await db.query(
			`DELETE
             FROM company_customers
             WHERE company_id = $1 AND customer_name = $2
             RETURNING company_id, customer_name`,
			[companyId, customerName]
		);
		const customer = result.rows[0];

		if (!customer) throw new NotFoundError(`No customer: ${customerName}`);

		return { message: "Deleted successfully" };
	}

	/** Get the count of customers for a given company.
	 *
	 * Returns the total number of customers for the specified company.
	 */
	static async getCustomerCount(companyId) {
		const result = await db.query(
			`SELECT COUNT(*) AS count
             FROM company_customers
             WHERE company_id = $1`,
			[companyId]
		);

		if (!result.rows.length) {
			throw new Error("No customers found for the given company.");
		}

		return result.rows[0].count;
	}
}

module.exports = Customer;
