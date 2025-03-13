"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for rfqs */

class Rfq {
	/** Create a rfq (from data), update db, return new rfq data.
	 *
	 * data should be { company_id, customer_name, user_id, rfq_number }
	 *
	 * Returns { id, companyId, customerName, userId, rfqNumber, createdAt }
	 * */

	static async create({ company_id, customer_name, user_id, rfq_number }) {
		const result = await db.query(
			`INSERT INTO rfqs
         (company_id, customer_name, user_id, rfq_number)
         VALUES ($1, $2, $3, $4)
         RETURNING id, company_id AS "companyId", customer_name AS "customerName", user_id AS "userId", rfq_number AS "rfqNumber", created_at AS "createdAt" `,
			[company_id, customer_name, user_id, rfq_number]
		);
		const rfq = result.rows[0];

		return rfq;
	}

	/** Find all rfqs (optional filter on searchFilters).
	 *
	 * Returns [{ id, companyId, customerName, userId, rfqNumber, createdAt }, ...]
	 * */

	static async findAll(searchFilters = {}) {
		let query = `SELECT rfqs.id, 
							rfqs.company_id AS "companyId", 
							rfqs.customer_name AS "customerName", 
							rfqs.user_id AS "userId", 
							rfqs.rfq_number AS "rfqNumber", 
							rfqs.created_at AS "createdAt", 
							COALESCE(SUM(rfq_items.quantity * company_items.cost), 0) AS rfqTotal,
							users.full_name AS "userFullName",
							companies.name AS "companyName",
							company_customers.customer_name AS "customerName"  -- Use customer_name instead of name
					FROM rfqs
					LEFT JOIN rfq_items ON rfqs.id = rfq_items.rfq_id
					LEFT JOIN company_items ON rfq_items.company_id = company_items.company_id AND rfq_items.item_code = company_items.item_code
					LEFT JOIN users ON rfqs.user_id = users.id
					LEFT JOIN companies ON rfqs.company_id = companies.id
					LEFT JOIN company_customers ON rfqs.company_id = company_customers.company_id AND rfqs.customer_name = company_customers.customer_name
					WHERE 1=1`;

		let queryValues = [];
		const { companyId, userId, rfqNumber } = searchFilters;

		// Add filter for companyId if provided
		if (companyId) {
			query += ` AND rfqs.company_id = $${queryValues.length + 1}`;
			queryValues.push(companyId);
		}

		// Add filter for userId if provided
		if (userId) {
			query += ` AND rfqs.user_id = $${queryValues.length + 1}`;
			queryValues.push(userId);
		}

		// If an RFQ ID filter is provided, add it to the WHERE clause
		if (rfqNumber) {
			query += ` AND rfqs.rfq_number = $${queryValues.length + 1}`;
			queryValues.push(rfqNumber);
		}

		query += ` GROUP BY rfqs.id, users.full_name, companies.name, company_customers.customer_name ORDER BY rfqs.id`; // Correct GROUP BY for customer_name

		const rfqsRes = await db.query(query, queryValues);
		return rfqsRes.rows;
	}

	/** Get the count of rfqs for a given user. */
	static async getRfqCount(userId, companyId) {
		try {
			let query = `SELECT COUNT(*) AS count FROM rfqs WHERE 1=1`;

			const queryParams = [];

			// If userId is provided, add it to the query
			if (userId) {
				query += ` AND user_id = $${queryParams.length + 1}`;
				queryParams.push(userId);
			}

			// If companyId is provided, add it to the query
			if (companyId) {
				query += ` AND company_id = $${queryParams.length + 1}`;
				queryParams.push(companyId);
			}

			// Run the query
			const result = await db.query(query, queryParams);

			// Return the count (default to 0 if no rows are found)
			return result.rows.length > 0 ? result.rows[0].count : 0;
		} catch (err) {
			console.error("Error fetching RFQ count:", err);
			throw new Error("Error fetching RFQ count.");
		}
	}

	/** Given a rfq id, return data about rfq.
	 *
	 * Throws NotFoundError if not found.
	 **/

	static async get(id) {
		const rfqRes = await db.query(
			`SELECT rfqs.id, 
					rfqs.company_id AS "companyId", 
					rfqs.customer_name AS "customerName",
					rfqs.user_id AS "userId", 
					users.full_name AS "userFullName",
					rfqs.rfq_number AS "rfqNumber", 
					rfqs.created_at AS "createdAt",
					rfq_items.id AS rfq_item_id, 
					rfq_items.item_code, 
					rfq_items.quantity,
					company_items.cost AS "itemCost",
					company_items.uom AS "itemUom",
					company_items.description AS "itemDescription"
			 FROM rfqs
			 LEFT JOIN users ON rfqs.user_id = users.id
			 LEFT JOIN companies ON rfqs.company_id = companies.id
			 LEFT JOIN company_customers ON rfqs.company_id = company_customers.company_id AND rfqs.customer_name = company_customers.customer_name
			 LEFT JOIN rfq_items ON rfqs.id = rfq_items.rfq_id
			 LEFT JOIN company_items ON rfq_items.company_id = company_items.company_id AND rfq_items.item_code = company_items.item_code
			 WHERE rfqs.id = $1`,
			[id]
		);

		const rfq = rfqRes.rows[0];

		if (!rfq) throw new NotFoundError(`No RFQ: ${id}`);

		// Group all item-related details under rfqItems
		const rfqItems = rfqRes.rows
			.filter((row) => row.rfq_item_id) // Ensure only valid RFQ items are included
			.map((row) => ({
				id: row.rfq_item_id,
				itemCode: row.item_code,
				quantity: row.quantity,
				itemCost: row.itemCost,
				itemUom: row.itemUom,
				itemDescription: row.itemDescription,
			}));

		// Remove item-specific fields from the main RFQ object
		const { rfq_item_id, itemCode, itemCost, itemUom, itemDescription, ...rfqDetails } = rfq;

		return {
			...rfqDetails, // Includes companyId, customerName, userFullName
			rfqItems, // Nested item details
		};
	}

	/** Update rfq data with `data`.
	 *
	 * This is a "partial update" --- it's fine if data doesn't contain all the
	 * fields; this only changes provided ones.
	 *
	 * Data can include: { id, customer_name, user_id, company_id, rfq_number }
	 *
	 * Returns { id, companyId, customerName, userId, rfqNumber, createdAt }
	 *
	 * Throws NotFoundError if not found.
	 */

	static async update(id, data) {
		try {
			// Use sqlForPartialUpdate to generate the SQL columns and values
			const { setCols, values } = sqlForPartialUpdate(data, {
				customer_name: "customer_name",
				user_id: "user_id",
				company_id: "company_id",
				rfq_number: "rfq_number",
			});

			const idVarIdx = "$" + (values.length + 1);

			const querySql = `UPDATE rfqs 
							SET ${setCols} 
							WHERE id = ${idVarIdx} 
							RETURNING id, company_id AS "companyId", customer_name AS "customerName", user_id AS "userId", rfq_number AS "rfqNumber", created_at AS "createdAt"`;

			// Execute the query
			const result = await db.query(querySql, [...values, id]);
			const rfq = result.rows[0];

			if (!rfq) throw new NotFoundError(`No RFQ: ${id}`);

			return rfq;
		} catch (err) {
			console.error("Error updating RFQ:", err);
			throw err;
		}
	}

	/** Delete given rfq from database; returns undefined.
	 *
	 * Throws NotFoundError if rfq not found.
	 **/

	static async remove(id) {
		const result = await db.query(
			`DELETE
           FROM rfqs
           WHERE id = $1
           RETURNING id`,
			[id]
		);
		const rfq = result.rows[0];

		if (!rfq) throw new NotFoundError(`No RFQ: ${id}`);

		return { message: "Deleted successfully" };
	}

	/** Create an item for an RFQ in the rfq_items table.
	 *
	 * data should be { rfq_id, item_code, quantity }
	 *
	 * Returns { id, rfq_id, item_code, quantity }
	 */

	static async createRfqItem({ rfq_id, company_id, item_code, quantity, item_description, item_cost }) {
		if (!company_id) {
			throw new BadRequestError("Company ID is required.");
		}

		if (quantity <= 0) {
			throw new BadRequestError("Quantity must be greater than 0.");
		}

		const result = await db.query(
			`INSERT INTO rfq_items (rfq_id, company_id, item_code, quantity, item_description, item_cost)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING id, rfq_id, company_id, item_code, quantity, item_description, item_cost`,
			[rfq_id, company_id, item_code, quantity, item_description, item_cost]
		);
		const rfqItem = result.rows[0];

		return rfqItem;
	}

	/** Update an RFQ item with new data.
	 *
	 * Data can include: { quantity }
	 *
	 * Returns { id, rfq_id, item_code, quantity }
	 */

	static async updateRfqItem(id, data) {
		try {
			// Use sqlForPartialUpdate to generate the SQL columns and values
			const { setCols, values } = sqlForPartialUpdate(data, {
				quantity: "quantity", // Add any other fields as needed
			});

			// Log the SQL query and values for debugging
			const idVarIdx = "$" + (values.length + 1); // For id parameter
			const querySql = `UPDATE rfq_items
							SET ${setCols}
							WHERE id = ${idVarIdx}
							RETURNING id, rfq_id, item_code, quantity`;

			// Execute the query, passing the values and id
			const result = await db.query(querySql, [...values, id]);
			const rfqItem = result.rows[0];

			if (!rfqItem) throw new NotFoundError(`No RFQ Item: ${id}`);

			return rfqItem;
		} catch (err) {
			console.error("Error updating RFQ item:", err);
			throw err;
		}
	}

	/** Delete an item from the rfq_items table.
	 *
	 * Throws NotFoundError if not found.
	 */

	static async removeRfqItem(id) {
		const result = await db.query(
			`DELETE FROM rfq_items
			 WHERE id = $1
			 RETURNING id`,
			[id]
		);

		const rfqItem = result.rows[0];

		if (!rfqItem) throw new NotFoundError(`No RFQ Item: ${id}`);

		return { message: "Deleted successfully" };
	}
}

module.exports = Rfq;
