const bcrypt = require("bcrypt");
const db = require("../db.js");
const { BCRYPT_WORK_FACTOR } = require("../config");

const testCompanyIds = [];
const testUserIds = [];
const testCustomerNames = [];
const testItemCodes = [];
const testRfqIds = [];
const testQuoteIds = [];

async function commonBeforeAll() {
	// Clean up previous data
	await db.query("DELETE FROM quote_items");
	await db.query("DELETE FROM rfq_items");
	await db.query("DELETE FROM quotes");
	await db.query("DELETE FROM rfqs");
	await db.query("DELETE FROM company_items");
	await db.query("DELETE FROM company_customers");
	await db.query("DELETE FROM users");
	await db.query("DELETE FROM companies");

	// Insert data into companies table
	const companyResults = await db.query(`
    INSERT INTO companies(name, address_line1, address_line2, city, state, country, phone_main)
    VALUES 
      ('Company 1', '123 Main St', 'Suite 101', 'City 1', 'ST', 'USA', '123-456-7890'),
      ('Company 2', '456 Oak St', 'Suite 202', 'City 2', 'ST', 'USA', '987-654-3210'),
      ('Company 3', '789 Pine St', 'Suite 303', 'City 3', 'ST', 'USA', '555-123-4567')
    RETURNING id`);

	testCompanyIds.splice(0, 0, ...companyResults.rows.map((r) => r.id));

	// Insert data into users table
	const userResults = await db.query(
		`
    INSERT INTO users(email, password, full_name, phone, is_admin, company_id)
    VALUES 
      ('user1@example.com', $1, 'User One', '111-222-3333', FALSE, $2),
      ('user2@example.com', $2, 'User Two', '444-555-6666', TRUE, $3)
    RETURNING id`,
		[await bcrypt.hash("password1", BCRYPT_WORK_FACTOR), await bcrypt.hash("password2", BCRYPT_WORK_FACTOR), testCompanyIds[0], testCompanyIds[1]]
	);

	testUserIds.splice(0, 0, ...userResults.rows.map((r) => r.id));

	// Insert data into company_customers table
	const customerResults = await db.query(
		`
    INSERT INTO company_customers(company_id, customer_name, address_line1, address_line2, city, state, country, phone_main, markup_type, markup)
    VALUES 
      ($1, 'Customer 1', '1000 Market St', 'Apt 1', 'City 1', 'ST', 'USA', '333-444-5555', 'Percentage', 10),
      ($2, 'Customer 2', '2000 Broad St', 'Apt 2', 'City 2', 'ST', 'USA', '666-777-8888', 'Flat', 20)
    RETURNING company_id, customer_name`,
		[testCompanyIds[0], testCompanyIds[1]]
	);

	testCustomerNames.push(...customerResults.rows.map((r) => r.customer_name));

	// Insert data into company_items table
	const itemResults = await db.query(
		`
    INSERT INTO company_items(company_id, item_code, description, uom, cost)
    VALUES 
      ($1, 'ITEM001', 'Item 1 Description', 'Each', 50.00),
      ($1, 'ITEM002', 'Item 2 Description', 'Each', 100.00),
      ($2, 'ITEM003', 'Item 3 Description', 'Each', 150.00)
    RETURNING company_id, item_code`,
		[testCompanyIds[0], testCompanyIds[1]]
	);

	testItemCodes.push(...itemResults.rows.map((r) => r.item_code));

	// Insert data into rfqs table
	const rfqResults = await db.query(
		`
    INSERT INTO rfqs(company_id, customer_name, user_id, rfq_number)
    VALUES 
      ($1, $2, $3, 'RFQ001'),
      ($2, $3, $4, 'RFQ002')
    RETURNING id`,
		[testCompanyIds[0], testCustomerNames[0], testUserIds[0], testUserIds[1]]
	);

	testRfqIds.push(...rfqResults.rows.map((r) => r.id));

	// Insert data into quotes table
	const quoteResults = await db.query(
		`
    INSERT INTO quotes(company_id, customer_name, user_id, quote_number, valid_until)
    VALUES 
      ($1, $2, $3, 'QUOTE001', '2025-12-31'),
      ($2, $3, $4, 'QUOTE002', '2025-12-31')
    RETURNING id`,
		[testCompanyIds[0], testCustomerNames[0], testUserIds[0], testUserIds[1]]
	);

	testQuoteIds.push(...quoteResults.rows.map((r) => r.id));

	// Insert data into rfq_items table
	await db.query(
		`
    INSERT INTO rfq_items(rfq_id, company_id, item_code, quantity, item_description, item_cost)
    VALUES 
      ($1, $2, 'ITEM001', 5, 'Item 1 Description', 50.00),
      ($2, $3, 'ITEM003', 10, 'Item 3 Description', 150.00)`,
		[testRfqIds[0], testCompanyIds[0], testCompanyIds[1]]
	);

	// Insert data into quote_items table
	await db.query(
		`
    INSERT INTO quote_items(quote_id, company_id, item_code, quantity, item_description, item_price)
    VALUES 
      ($1, $2, 'ITEM001', 3, 'Item 1 Description', 50.00),
      ($2, $3, 'ITEM002', 4, 'Item 2 Description', 100.00)`,
		[testQuoteIds[0], testCompanyIds[0], testCompanyIds[1]]
	);
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

module.exports = {
	commonBeforeAll,
	commonBeforeEach,
	commonAfterEach,
	commonAfterAll,
	testCompanyIds,
	testUserIds,
	testCustomerNames,
	testItemCodes,
	testRfqIds,
	testQuoteIds,
};
