"use strict";

/** Routes for companies. */

const express = require("express");
const { ensureAdmin, ensureLoggedIn, ensureCorrectUserOrAdmin } = require("../middleware/auth");
const Company = require("../models/company");

const router = new express.Router();

/** POST /company  { company } => { company }
 *
 * Creates a new company in the database.
 * Expects the request body to include { name, addressLine1, addressLine2, city, state, country, mainPhone }
 *
 * Returns the newly created company data: { name, addressLine1, addressLine2, city, state, country, mainPhone }
 *
 * Authorization required: none
 */
router.post("/company", async function (req, res, next) {
	try {
		const company = await Company.create(req.body);
		return res.status(201).json({ company });
	} catch (err) {
		console.error("Error in company creation:", err);
		return next(err);
	}
});

/** GET /  =>  { companies: [ { name, addressLine1, addressLine2, city, state, country, mainPhone }, ...] }
 *
 * Retrieves a list of all companies in the database.
 * Optionally, query parameters can be used to filter the results.
 *
 * Authorization required: none
 */
router.get("/", async function (req, res, next) {
	const q = req.query;
	try {
		const companies = await Company.findAll(q);
		return res.json({ companies });
	} catch (err) {
		return next(err);
	}
});

/** GET /company/:name  => { company }
 *
 * Retrieves a company by its name.
 * Company data returned includes: { name, addressLine1, addressLine2, city, state, country, mainPhone }
 *
 * Authorization required: logged-in user (ensures that the user is authenticated)
 */
router.get("/company/:name", ensureLoggedIn, async function (req, res, next) {
	try {
		// Fetch company by name using the getByName method
		const company = await Company.getByName(req.params.name);
		return res.json({ company });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /company/:name { fld1, fld2, ... } => { company }
 *
 * Updates an existing company's details.
 * Acceptable fields to update: { addressLine1, addressLine2, city, state, country, mainPhone }
 *
 * Returns the updated company data: { name, addressLine1, addressLine2, city, state, country, mainPhone }
 *
 * Authorization required: admin (ensures the user is an admin)
 */
router.patch("/company/:name", ensureAdmin, async function (req, res, next) {
	try {
		const company = await Company.update(req.params.name, req.body);
		return res.json({ company });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /company/:name  => { deleted: name }
 *
 * Deletes a company by its name from the database.
 *
 * Authorization required: admin (ensures the user is an admin)
 */
router.delete("/company/:name", ensureAdmin, async function (req, res, next) {
	try {
		await Company.remove(req.params.name);
		return res.json({ deleted: req.params.name });
	} catch (err) {
		return next(err);
	}
});

/**
 * POST /company/add-customer
 * Adds a customer to the company_customers table.
 * Requires { companyId, customerId }
 * Returns { companyCustomer: { companyId, customerId } }
 *
 * Authorization required: logged-in user or admin (ensures the user is authorized to add customers to a company)
 */
router.post("/company/add-customer", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const { companyId, customerId } = req.body;

		// Add the customer to the company's customer list
		const companyCustomer = await Company.addCustomer(companyId, customerId);

		return res.status(201).json({ companyCustomer });
	} catch (err) {
		return next(err);
	}
});

/**
 * POST /company/add-item
 * Adds an item to the company_items table.
 * Requires { companyId, itemCode }
 * Returns { companyItem: { companyId, itemCode } }
 *
 * Authorization required: logged-in user or admin (ensures the user is authorized to add items to a company)
 */
router.post("/company/add-item", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const { companyId, itemCode } = req.body;

		// Add the item to the company's item list
		const companyItem = await Company.addItem(companyId, itemCode);

		return res.status(201).json({ companyItem });
	} catch (err) {
		return next(err);
	}
});

/** GET /company/:companyId/directory  => { company, users }
 *
 * Retrieves company details along with the list of users associated with the company.
 * The response will include the company information and the list of users with their details.
 *
 * Authorization required: logged-in user or admin (ensures the user has access to view the company directory)
 */
router.get("/company/:companyId/directory", ensureCorrectUserOrAdmin, async (req, res, next) => {
	try {
		const { companyId } = req.params;
		const directory = await Company.getDirectory(companyId);
		return res.json(directory);
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
