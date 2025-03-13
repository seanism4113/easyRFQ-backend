"use strict";

/** Routes for customers. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureCorrectUserOrAdmin } = require("../middleware/auth");
const Customer = require("../models/customer");

const router = new express.Router();

/** POST / { customer } =>  { customer }
 *
 * customer should be { company_id, customer_name, address_line1, address_line2, city, state, country, phone_main, markup_type, markup }
 *
 * Returns { company_id, customer_name, address_line1, address_line2, city, state, country, phone_main, markup_type, markup }
 *
 * Authorization required: admin or correct user
 */

router.post("/", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const customer = await Customer.create(req.body);
		return res.status(201).json({ customer });
	} catch (err) {
		return next(err);
	}
});

/** GET /  =>
 *   { customers: [ { company_id, customer_name, address_line1, address_line2, city, state, country, phone_main, markup_type, markup }, ...] }
 *
 * Authorization required: admin or correct user
 */

router.get("/", ensureCorrectUserOrAdmin, async function (req, res, next) {
	const { companyId } = req.query;
	const searchFilters = req.query;

	try {
		const customers = await Customer.findAll(companyId, searchFilters); // Pass company_id to the model method
		return res.json({ customers });
	} catch (err) {
		return next(err);
	}
});

/** GET /customer/:customerName  =>  { customer }
 *
 *  Customer is { company_id, customer_name, address_line1, address_line2, city, state, country, phone_main, markup_type, markup }
 *
 * Authorization required: admin or correct user
 */

router.get("/customer/:customerName", ensureCorrectUserOrAdmin, async function (req, res, next) {
	const { customerName } = req.params; // Extract customerName from URL path
	const { companyId } = req.query; // Extract companyId from query string

	if (!companyId) {
		return res.status(400).json({ error: "companyId is required" });
	}

	try {
		// Call the Customer.get method passing both companyId and customerName
		const customer = await Customer.get(companyId, customerName);
		return res.json({ customer });
	} catch (err) {
		return next(err);
	}
});

/** GET /count?companyId=xyz => { count: number }
 *
 * Returns the total number of customers for a given company.
 */

router.get("/count", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const { companyId } = req.query;
		if (!companyId) throw new BadRequestError("companyId is required");
		const count = await Customer.getCustomerCount(companyId);
		return res.json({ count });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /customer/:customerName { fld1, fld2, ... } => { customer }
 *
 * Patches customer data.
 *
 * fields can be: { customer_name, markup_type, markup, address_line1, address_line2, city, state, country, phone_main }
 *
 * Returns { company_id, customer_name, markup_type, markup, address_line1, address_line2, city, state, country, phone_main }
 *
 * Authorization required: admin or correct user
 */

router.patch("/customer/:customerName", ensureCorrectUserOrAdmin, async function (req, res, next) {
	const { companyId } = req.query; // Extract companyId from query
	try {
		const customer = await Customer.update(companyId, req.params.customerName, req.body);
		return res.json({ customer });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /customer/:customerName  =>  { deleted: customerName }
 *
 * Authorization: admin or correct user
 */

router.delete("/customer/:customerName", ensureCorrectUserOrAdmin, async function (req, res, next) {
	const { companyId } = req.query; // Extract companyId from query
	try {
		await Customer.remove(companyId, req.params.customerName);
		return res.json({ deleted: req.params.customerName });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
