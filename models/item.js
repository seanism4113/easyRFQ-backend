"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for items */

class Item {
	/** Create an item (from data), update db, return new item data.
	 *
	 * data should be { companyId, itemCode, description, uom, cost }
	 *
	 * Returns { companyId, itemCode, description, uom, cost }
	 *
	 * Throws BadRequestError if item already in database.
	 * */
	static async create({ companyId, itemCode, description, uom, cost }) {
		const duplicateCheck = await db.query(
			`SELECT item_code
       FROM company_items
       WHERE company_id = $1 AND item_code = $2`,
			[companyId, itemCode]
		);

		if (duplicateCheck.rows[0]) throw new BadRequestError(`Duplicate item: ${itemCode}`);

		const result = await db.query(
			`INSERT INTO company_items
       (company_id, item_code, description, uom, cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING company_id AS "companyId", item_code AS "itemCode", description, uom, cost`,
			[companyId, itemCode, description, uom, cost]
		);
		const item = result.rows[0];

		return item;
	}

	/** Find all items for a given company (optional filter on searchFilters).
	 *
	 * Returns [{ companyId, itemCode, description, uom, cost }, ...]
	 * */
	static async findAll(companyId, searchFilters = {}) {
		let query = `SELECT ci.company_id AS "companyId",
                        ci.item_code AS "itemCode",
                        ci.description,
                        ci.uom,
                        ci.cost
                 FROM company_items ci
                 WHERE ci.company_id = $1`;

		let queryValues = [companyId];

		const { itemCode } = searchFilters;

		// If an itemCode filter is provided, add it to the WHERE clause correctly
		if (itemCode) {
			query += ` AND CAST(ci.item_code AS TEXT) ILIKE $${queryValues.length + 1}`;
			queryValues.push(`%${itemCode}%`);
		}

		query += " ORDER BY ci.item_code"; // Sort by item code

		const itemsRes = await db.query(query, queryValues);
		return itemsRes.rows;
	}

	/** Get the count of items for a given company. */
	static async getItemCount(companyId) {
		const result = await db.query(
			`SELECT COUNT(*) AS count
       FROM company_items ci
       WHERE ci.company_id = $1`,
			[companyId]
		);

		if (!result.rows.length) {
			throw new Error("No items found for the given company.");
		}

		return result.rows[0].count;
	}

	/** Given an item code and company id, return data about the item.
	 *
	 * Throws NotFoundError if not found.
	 **/
	static async get(companyId, itemCode) {
		const itemRes = await db.query(
			`SELECT company_id AS "companyId",
              item_code AS "itemCode",
              description,
              uom,
              cost
       FROM company_items
       WHERE company_id = $1 AND item_code = $2`,
			[companyId, itemCode]
		);

		const item = itemRes.rows[0];

		if (!item) throw new NotFoundError(`No item: ${itemCode} for company: ${companyId}`);

		return item;
	}

	/** Update item data with `data`.
	 *
	 * This is a "partial update" — it's fine if data doesn't contain all the
	 * fields; this only changes provided ones.
	 *
	 * Data can include: { description, uom, cost }
	 *
	 * Returns { companyId, itemCode, description, uom, cost }
	 *
	 * Throws NotFoundError if not found.
	 */
	static async update(companyId, itemCode, data) {
		try {
			// Use sqlForPartialUpdate to generate the SQL columns and values, excluding 'item_code' and 'company_id'
			const { setCols, values } = sqlForPartialUpdate(data, {
				description: "description",
				uom: "uom",
				cost: "cost",
			});

			const querySql = `UPDATE company_items
							SET ${setCols}
							WHERE company_id = $${values.length + 1} AND item_code = $${values.length + 2}
							RETURNING company_id AS "companyId", item_code AS "itemCode", description, uom, cost`;

			// Execute the query
			const result = await db.query(querySql, [...values, companyId, itemCode]);
			const item = result.rows[0];

			if (!item) throw new NotFoundError(`No item: ${itemCode} for company: ${companyId}`);

			return item;
		} catch (err) {
			console.error("Error updating item:", err);
			throw err;
		}
	}

	/** Delete given item from database; returns undefined.
	 *
	 * Throws NotFoundError if item not found.
	 **/
	static async remove(companyId, itemCode) {
		const result = await db.query(
			`DELETE
       FROM company_items
       WHERE company_id = $1 AND item_code = $2
       RETURNING company_id, item_code`,
			[companyId, itemCode]
		);
		const item = result.rows[0];

		if (!item) throw new NotFoundError(`No item: ${itemCode} for company: ${companyId}`);

		return { message: "Deleted successfully" };
	}
}

module.exports = Item;
