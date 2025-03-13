"use strict";

const db = require("../db.js");
const User = require("../models/user");
const Company = require("../models/company");
const Customer = require("../models/customer");
const Item = require("../models/item");
const RFQ = require("../models/rfq");
const Quote = require("../models/quote");
const { createToken } = require("../helpers/tokens");

const testRFQIds = [];
const testQuoteIds = [];

async function commonBeforeAll() {
	await db.query("DELETE FROM quote_items");
	await db.query("DELETE FROM rfq_items");
	await db.query("DELETE FROM quotes");
	await db.query("DELETE FROM rfqs");
	await db.query("DELETE FROM company_items");
	await db.query("DELETE FROM company_customers");
	await db.query("DELETE FROM users");
	await db.query("DELETE FROM companies");

	const c1 = await Company.create({
		name: "Aerospace Innovations",
		address_line1: "123 Space Ave",
		city: "Houston",
		state: "TX",
		phone_main: "555-1234",
	});

	const u1 = await User.register({
		email: "user1@example.com",
		password: "password1",
		full_name: "User One",
		phone: "555-1111",
		is_admin: false,
		company_id: c1.id,
	});

	await Customer.create({
		company_id: c1.id,
		customer_name: "NASA",
		address_line1: "1 Space Center Blvd",
		city: "Houston",
		state: "TX",
		phone_main: "555-9876",
		markup_type: "percentage",
		markup: 15,
	});

	await Item.create({
		company_id: c1.id,
		item_code: "A100",
		description: "Rocket Engine",
		uom: "unit",
		cost: 500000,
	});

	testRFQIds[0] = (
		await RFQ.create({
			company_id: c1.id,
			customer_name: "NASA",
			user_id: u1.id,
			rfq_number: "RFQ-001",
		})
	).id;

	testQuoteIds[0] = (
		await Quote.create({
			company_id: c1.id,
			customer_name: "NASA",
			user_id: u1.id,
			quote_number: "Q-001",
			valid_until: "2025-12-31",
		})
	).id;
}

async function commonBeforeEach() {
	await db.query("BEGIN");
}

async function commonAfterEach() {
	await db.query("ROLLBACK");
}

async function commonAfterAll() {
	await db.end();
}

const u1Token = createToken({ email: "user1@example.com", isAdmin: false });
const adminToken = createToken({ email: "admin@example.com", isAdmin: true });

module.exports = {
	commonBeforeAll,
	commonBeforeEach,
	commonAfterEach,
	commonAfterAll,
	testRFQIds,
	testQuoteIds,
	u1Token,
	adminToken,
};
