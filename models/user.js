"use strict";

const db = require("../db.js");
const bcrypt = require("bcrypt");
const { sqlForPartialUpdate } = require("../helpers/sql.js");
const { NotFoundError, BadRequestError, UnauthorizedError } = require("../expressError.js");

const { BCRYPT_WORK_FACTOR } = require("../config.js");

/** Related functions for users. */

class User {
	/** authenticate user with email, password.
	 *
	 * Returns { id, email, full_name, phone, is_admin, company_id }
	 *
	 * Throws UnauthorizedError if user is not found or wrong password.
	 **/

	static async authenticate(email, password) {
		// try to find the user first
		const result = await db.query(
			`SELECT id, email,
                  password,
                  full_name AS "fullName",
				  phone,
                  is_admin AS "isAdmin",
				  company_id AS "companyId"
           FROM users
           WHERE email = $1`,
			[email]
		);

		const user = result.rows[0];

		if (user) {
			// compare hashed password to a new hash from password
			const isValid = await bcrypt.compare(password, user.password);
			if (isValid === true) {
				delete user.password;
				return user;
			}
		}

		throw new UnauthorizedError("Invalid email/password");
	}

	/** Register user with data.
	 *
	 * Returns { email, fullName, phone, isAdmin, companyId }
	 *
	 * Throws BadRequestError on duplicates.
	 **/

	static async register({ email, password, fullName, phone = null, isAdmin, companyId }) {
		const duplicateCheck = await db.query(
			`SELECT email
           FROM users
           WHERE email = $1`,
			[email]
		);

		if (duplicateCheck.rows[0]) {
			throw new BadRequestError(`Duplicate email: ${email}`);
		}

		const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

		const result = await db.query(
			`INSERT INTO users
           (email,
            password,
            full_name,
            phone,
            is_admin,
			company_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, email, full_name AS "fullName", phone, is_admin AS "isAdmin", company_id AS "companyId"`,
			[email, hashedPassword, fullName, phone, isAdmin, companyId]
		);

		const user = result.rows[0];

		return user;
	}

	/** Find all users.
	 *
	 * Returns [{ email, fullName, phone, is_admin, companyId }, ...]
	 **/

	static async findAll() {
		const result = await db.query(
			`SELECT id,
				email,
                full_name AS "fullName",
                phone,
                is_admin AS "isAdmin",
				company_id AS "companyId"
           FROM users
           ORDER BY id`
		);

		return result.rows;
	}

	/** Given a id, return data about user.
	 *
	 * Returns { email, full_name, phone, is_admin, companyId, rfqs, quotes }
	 *   where rfqs is { id, customer_id, created_at }
	 *   where quotes is { id, customer_id, created_at, valid_until }
	 *
	 * Throws NotFoundError if user not found.
	 **/

	static async get(id) {
		const userRes = await db.query(
			`SELECT u.id, 
            u.email, 
			u.password,
            u.full_name AS "fullName", 
            u.phone, 
            u.is_admin AS "isAdmin", 
            u.company_id AS "companyId",
            c.name AS "companyName", 
            c.address_line1 AS "companyAddressLine1",
            c.address_line2 AS "companyAddressLine2",
            c.city AS "companyCity",
            c.state AS "companyState",
            c.country AS "companyCountry",
			c.phone_main AS "companyPhoneMain"
     		FROM users AS u
     		JOIN companies c 
			ON u.company_id = c.id
     		WHERE u.id = $1`,
			[id]
		);

		const user = userRes.rows[0];

		if (!user) throw new NotFoundError(`No user with id of: ${id}`);

		const userResult = {
			id: user.id,
			email: user.email,
			password: user.password,
			fullName: user.fullName,
			phone: user.phone,
			isAdmin: user.isAdmin,
			company: {
				companyId: user.companyId,
				companyName: user.companyName,
				companyAddressLine1: user.companyAddressLine1,
				companyAddressLine2: user.companyAddressLine2,
				companyCity: user.companyCity,
				companyState: user.companyState,
				companyCountry: user.companyCountry,
				companyPhoneMain: user.companyPhoneMain,
			},
		};

		const userRfqRes = await db.query(
			`SELECT r.id
           FROM rfqs AS r
           WHERE r.user_id = $1`,
			[id]
		);

		const userQuoteRes = await db.query(
			`SELECT q.id
           FROM quotes AS q
           WHERE q.user_id = $1`,
			[id]
		);

		userResult.rfqs = userRfqRes.rows.map((r) => r.id);
		userResult.quotes = userQuoteRes.rows.map((q) => q.id);
		return userResult;
	}

	/** Update user data with `data`.
	 *
	 * This is a "partial update" --- it's fine if data doesn't contain
	 * all the fields; this only changes provided ones.
	 *
	 * Data can include:
	 *   { email, fullName, phone }
	 *
	 * Returns { id, email, fullName, phone }
	 *
	 * Throws NotFoundError if not found.
	 *
	 */

	static async update(id, data) {
		if (data.password) {
			data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
		}

		const { setCols, values } = sqlForPartialUpdate(data, {
			email: "email",
			fullName: "full_name",
			phone: "phone",
		});
		const idIdx = "$" + (values.length + 1);

		const querySql = `UPDATE users 
						  SET ${setCols} 
						  WHERE id = ${idIdx} 
						  RETURNING id,
								   email,
								   full_name AS "fullName",
								   phone,
								   is_admin AS "isAdmin",
								   company_id AS "companyId"`;
		const result = await db.query(querySql, [...values, id]);
		const user = result.rows[0];

		if (!user) throw new NotFoundError(`No user with id of: ${id}`);

		// After updating, get the company info as well
		const companyRes = await db.query(
			`SELECT c.name AS "companyName", 
				  c.address_line1 AS "companyAddressLine1",
				  c.address_line2 AS "companyAddressLine2", 
				  c.city AS "companyCity", 
				  c.state AS "companyState", 
				  c.country AS "companyCountry", 
				  c.phone_main AS "companyPhoneMain"
		   FROM companies c
		   WHERE c.id = $1`,
			[user.companyId]
		);

		const company = companyRes.rows[0];

		// If company info exists, add it to the user object
		if (company) {
			user.company = company;
		}

		delete user.password;
		return user;
	}

	/** Delete given user from database; returns undefined. */

	static async remove(id) {
		let result = await db.query(
			`DELETE
           FROM users
           WHERE id = $1
           RETURNING id`,
			[id]
		);
		const user = result.rows[0];

		if (!user) throw new NotFoundError(`No user with id of: ${id}`);
	}
}

module.exports = User;
