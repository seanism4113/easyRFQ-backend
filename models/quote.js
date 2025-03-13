"use strict";

const db = require("../db");
const { NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for quotes */

class Quote {
	/** Create a quote (from data), update db, return new quote data. */
	static async create({ company_id, customer_name, user_id, quote_number, valid_until, notes }) {
		const result = await db.query(
			`INSERT INTO quotes
         (company_id, customer_name, user_id, quote_number, valid_until, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, company_id AS "companyId", customer_name AS "customerName", 
                   user_id AS "userId", quote_number AS "quoteNumber", 
                   valid_until AS "validUntil", notes, created_at AS "createdAt" `,
			[company_id, customer_name, user_id, quote_number, valid_until, notes]
		);
		return result.rows[0];
	}

	/** Find all quotes (optional filter on searchFilters). */
	static async findAll(searchFilters = {}) {
		let query = `SELECT quotes.id,
            				quotes.company_id AS "companyId",
            				quotes.customer_name AS "customerName",
            				quotes.user_id AS "userId",
							quotes.quote_number AS "quoteNumber",
            				quotes.created_at AS "createdAt",
            				quotes.valid_until AS "validUntil",
							quotes.notes,
							COALESCE(SUM(quote_items.quantity * quote_items.item_price), 0) AS quoteTotal,
							users.full_name AS "userFullName",
							companies.name AS "companyName",
							company_customers.customer_name AS "customerName"
					FROM quotes
					LEFT JOIN quote_items ON quotes.id = quote_items.quote_id
					LEFT JOIN company_items ON quote_items.company_id = company_items.company_id AND quote_items.item_code = company_items.item_code
					LEFT JOIN users ON quotes.user_id = users.id
					LEFT JOIN companies ON quotes.company_id = companies.id
					LEFT JOIN company_customers ON quotes.company_id = company_customers.company_id AND quotes.customer_name = company_customers.customer_name
					WHERE 1=1`;

		const queryValues = [];
		const { companyId, userId, quoteNumber } = searchFilters;

		if (companyId) {
			query += ` AND quotes.company_id = $${queryValues.length + 1}`;
			queryValues.push(companyId);
		}

		if (userId) {
			query += ` AND quotes.user_id = $${queryValues.length + 1}`;
			queryValues.push(userId);
		}

		if (quoteNumber) {
			query += ` AND quotes.quote_number = $${queryValues.length + 1}`;
			queryValues.push(quoteNumber);
		}

		query += ` GROUP BY quotes.id, users.full_name, companies.name, company_customers.customer_name ORDER BY quotes.id`;

		const quotesRes = await db.query(query, queryValues);
		return quotesRes.rows;
	}

	/** Get the count of quotes for a given user. */
	static async getQuoteCount(userId, companyId) {
		try {
			let query = `SELECT COUNT(*) AS count FROM quotes WHERE 1=1`;

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
			console.error("Error fetching Quote count:", err);
			throw new Error("Error fetching Quote count.");
		}
	}

	/** Given a quote id, return data about the quote. */
	static async get(id) {
		// Fetch quote details
		const result = await db.query(
			`SELECT 
			quotes.id,
			quotes.company_id AS "companyId",
			quotes.customer_name AS "customerName",
			quotes.user_id AS "userId",
			quotes.created_at AS "createdAt",
			quotes.valid_until AS "validUntil",
			quotes.quote_number AS "quoteNumber",
			quotes.notes
		  FROM quotes
		  WHERE quotes.id = $1`,
			[id]
		);

		const quote = result.rows[0];
		if (!quote) throw new NotFoundError(`No quote: ${id}`);

		// Fetch associated quote items
		const itemsResult = await db.query(
			`SELECT 
			quote_items.id AS "quoteItemId",
			quote_items.item_code AS "itemCode",
			quote_items.quantity,
			quote_items.item_description AS "itemDescription",
			quote_items.item_price AS "itemPrice",
			company_items.description AS "itemDescription",
			company_items.uom AS "itemUom"
		  FROM quote_items
		  LEFT JOIN company_items ON quote_items.company_id = company_items.company_id 
			AND quote_items.item_code = company_items.item_code
		  WHERE quote_items.quote_id = $1`,
			[id]
		);

		// Group all item-related details under quoteItems
		const quoteItems = itemsResult.rows.map((row) => ({
			id: row.quoteItemId,
			itemCode: row.itemCode,
			quantity: row.quantity,
			itemDescription: row.itemDescription,
			itemPrice: row.itemPrice,
			itemUom: row.itemUom,
		}));

		// Remove item-specific fields from the main Quote object
		const { quoteItemId, itemCode, itemDescription, itemPrice, itemUom, ...quoteDetails } = quote;

		return {
			...quoteDetails, // Includes companyId, customerName, userId, etc.
			quoteItems, // Nested item details
		};
	}

	/** Update quote data with `data`. */
	static async update(id, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {
			customer_name: "customer_name",
			user_id: "user_id",
			company_id: "company_id",
			quote_number: "quote_number",
			valid_until: "valid_until",
			notes: "notes",
		});

		const result = await db.query(`UPDATE quotes SET ${setCols} WHERE id = $${values.length + 1} RETURNING *`, [...values, id]);
		const quote = result.rows[0];
		if (!quote) throw new NotFoundError(`No quote: ${id}`);
		return quote;
	}

	/** Delete given quote from database; returns undefined. */
	static async remove(id) {
		const result = await db.query(`DELETE FROM quotes WHERE id = $1 RETURNING id`, [id]);
		if (!result.rows[0]) throw new NotFoundError(`No quote: ${id}`);
		return { message: "Deleted successfully" };
	}

	/** Create an item for a quote in the quote_items table. */
	static async createQuoteItem({ quote_id, company_id, item_code, quantity, item_description, item_price }) {
		const result = await db.query(
			`INSERT INTO quote_items (quote_id, company_id, item_code, quantity, item_description, item_price)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, quote_id, company_id, item_code, quantity, item_description, item_price`,
			[quote_id, company_id, item_code, quantity, item_description, item_price]
		);
		return result.rows[0];
	}

	/** Update a quote item with new data. */
	static async updateQuoteItem(id, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {
			quantity: "quantity",
		});

		const result = await db.query(`UPDATE quote_items SET ${setCols} WHERE id = $${values.length + 1} RETURNING *`, [...values, id]);
		const quoteItem = result.rows[0];
		if (!quoteItem) throw new NotFoundError(`No quote item: ${id}`);
		return quoteItem;
	}

	/** Delete a quote item from the quote_items table. */
	static async removeQuoteItem(id) {
		const result = await db.query(`DELETE FROM quote_items WHERE id = $1 RETURNING id`, [id]);
		if (!result.rows[0]) throw new NotFoundError(`No quote item: ${id}`);
		return { message: "Deleted successfully" };
	}
}

module.exports = Quote;
