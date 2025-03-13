"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const Customer = require("./customer");
const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll } = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
	const newCustomer = {
		company_id: 1,
		customer_name: "Customer1",
		address_line1: "123 Main St",
		address_line2: "Apt 4B",
		city: "New York",
		state: "NY",
		country: "USA",
		phone_main: "123-456-7890",
		markup_type: "percentage",
		markup: 15,
	};

	test("works", async function () {
		const customer = await Customer.create(newCustomer);
		expect(customer).toEqual({
			companyId: 1,
			customerName: "Customer1",
			addressLine1: "123 Main St",
			addressLine2: "Apt 4B",
			city: "New York",
			state: "NY",
			country: "USA",
			phoneMain: "123-456-7890",
			markupType: "percentage",
			markup: 15,
		});

		const result = await db.query(
			`SELECT company_id, customer_name, address_line1, address_line2, city, state, country, phone_main, markup_type, markup
       FROM company_customers
       WHERE customer_name = 'Customer1'`
		);
		expect(result.rows).toEqual([
			{
				company_id: 1,
				customer_name: "Customer1",
				address_line1: "123 Main St",
				address_line2: "Apt 4B",
				city: "New York",
				state: "NY",
				country: "USA",
				phone_main: "123-456-7890",
				markup_type: "percentage",
				markup: 15,
			},
		]);
	});

	test("bad request with duplicate customer", async function () {
		try {
			await Customer.create(newCustomer); // Create first customer
			await Customer.create(newCustomer); // Attempt to create duplicate
			fail();
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});

/************************************** findAll */

describe("findAll", function () {
	test("works: all customers", async function () {
		let customers = await Customer.findAll(1); // Assuming companyId = 1
		expect(customers).toEqual([
			{
				companyId: 1,
				customerName: "Customer1",
				addressLine1: "123 Main St",
				addressLine2: "Apt 4B",
				city: "New York",
				state: "NY",
				country: "USA",
				phoneMain: "123-456-7890",
				markupType: "percentage",
				markup: 15,
			},
		]);
	});

	test("works: by name filter", async function () {
		const customers = await Customer.findAll(1, { name: "Customer1" });
		expect(customers).toEqual([
			{
				companyId: 1,
				customerName: "Customer1",
				addressLine1: "123 Main St",
				addressLine2: "Apt 4B",
				city: "New York",
				state: "NY",
				country: "USA",
				phoneMain: "123-456-7890",
				markupType: "percentage",
				markup: 15,
			},
		]);
	});

	test("works: empty list if no customer found", async function () {
		const customers = await Customer.findAll(1, { name: "NonExistent" });
		expect(customers).toEqual([]);
	});
});

/************************************** get */

describe("get", function () {
	test("works", async function () {
		const customer = await Customer.get(1, "Customer1"); // Pass both company_id and customer_name
		expect(customer).toEqual({
			companyId: 1,
			customerName: "Customer1",
			addressLine1: "123 Main St",
			addressLine2: "Apt 4B",
			city: "New York",
			state: "NY",
			country: "USA",
			phoneMain: "123-456-7890",
			markupType: "percentage",
			markup: 15,
		});
	});

	test("not found if no such customer", async function () {
		try {
			await Customer.get(1, "NonExistent");
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/************************************** update */

describe("update", function () {
	const updateData = {
		customerName: "Updated Customer",
		addressLine1: "456 New St",
		addressLine2: "Apt 2B",
		city: "Los Angeles",
		state: "CA",
		country: "USA",
		phoneMain: "987-654-3210",
		markupType: "fixed",
		markup: 10,
	};

	test("works", async function () {
		const updatedCustomer = await Customer.update(1, "Customer1", updateData);
		expect(updatedCustomer).toEqual({
			companyId: 1,
			customerName: "Updated Customer",
			addressLine1: "456 New St",
			addressLine2: "Apt 2B",
			city: "Los Angeles",
			state: "CA",
			country: "USA",
			phoneMain: "987-654-3210",
			markupType: "fixed",
			markup: 10,
		});

		const result = await db.query(
			`SELECT company_id, customer_name, address_line1, address_line2, city, state, country, phone_main, markup_type, markup
       FROM company_customers
       WHERE customer_name = 'Updated Customer'`
		);
		expect(result.rows).toEqual([
			{
				company_id: 1,
				customer_name: "Updated Customer",
				address_line1: "456 New St",
				address_line2: "Apt 2B",
				city: "Los Angeles",
				state: "CA",
				country: "USA",
				phone_main: "987-654-3210",
				markup_type: "fixed",
				markup: 10,
			},
		]);
	});

	test("not found if customer does not exist", async function () {
		try {
			await Customer.update(1, "NonExistent", updateData);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/************************************** remove */

describe("remove", function () {
	test("works", async function () {
		await Customer.remove(1, "Customer1"); // Pass both company_id and customer_name
		const res = await db.query("SELECT customer_name FROM company_customers WHERE customer_name='Customer1'");
		expect(res.rows.length).toEqual(0);
	});

	test("not found if customer does not exist", async function () {
		try {
			await Customer.remove(1, "NonExistent");
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/************************************** getCustomerCount */

describe("getCustomerCount", function () {
	test("works", async function () {
		const count = await Customer.getCustomerCount(1); // Assuming 1 customer in company 1
		expect(count).toBe(1); // Assuming 1 customer in company 1
	});

	test("error if no customers found", async function () {
		try {
			await Customer.getCustomerCount(999); // Non-existent company
			fail();
		} catch (err) {
			expect(err).toBeTruthy();
		}
	});
});
