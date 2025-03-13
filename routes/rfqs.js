"use strict";

/** Routes for rfqs. */

const express = require("express");
const { BadRequestError } = require("../expressError");
const { ensureCorrectUserOrAdmin } = require("../middleware/auth");
const Rfq = require("../models/rfq");

const router = new express.Router();

/** POST / { rfq } =>  { rfq }
 *
 * rfq should be { company_id, customer_name, user_id, rfq_number }
 *
 * Returns { id, company_id, customer_name, user_id, rfq_number, created_at }
 */

router.post("/", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const rfq = await Rfq.create(req.body);
		return res.status(201).json({ rfq });
	} catch (err) {
		return next(err);
	}
});

/** GET /  =>
 *   { rfqs: [ { id, company_id, customer_name, user_id, rfq_number, created_at, rfq_total }, ...] }
 *
 * Optional query parameters can include:
 *  - companyId: Filter by company
 *  - userId: Filter by user
 *  - id: Filter by RFQ id
 */

router.get("/", ensureCorrectUserOrAdmin, async function (req, res, next) {
	const { companyId, userId, id } = req.query;

	// Collect the search filters from the query parameters
	const searchFilters = { companyId, userId, id };

	try {
		const rfqs = await Rfq.findAll(searchFilters); // Pass filters to the model method
		return res.json({ rfqs });
	} catch (err) {
		return next(err);
	}
});

/** GET /[id]  =>  { rfq }
 *
 * Rfq is { id, company_id, customer_name, user_id, rfq_number, created_at, rfq_items: [ { id, item_code, quantity, item_cost, item_uom, item_description }, ... ] }
 */

router.get("/rfq/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const rfq = await Rfq.get(req.params.id);
		return res.json({ rfq });
	} catch (err) {
		return next(err);
	}
});

/** GET /count?userId=xyz => { count: number }
 *
 * Returns the total number of rfqs for a given user or company.
 */

router.get("/count", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const { userId, companyId } = req.query;

		// Check if either userId or companyId is provided
		if (!userId && !companyId) {
			throw new BadRequestError("Either userId or companyId is required");
		}

		// Pass userId and companyId to the getRfqCount function
		const count = await Rfq.getRfqCount(userId, companyId);

		// Return the count as a response
		return res.json({ count });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /[id] { customer_name, user_id, company_id, rfq_number } => { rfq }
 *
 * Patches rfq data.
 *
 * Returns { id, company_id, customer_name, user_id, rfq_number, created_at }
 */

router.patch("/rfq/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const rfq = await Rfq.update(req.params.id, req.body);
		return res.json({ rfq });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[id]  =>  { deleted: id }
 */

router.delete("/rfq/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		await Rfq.remove(req.params.id);
		return res.json({ deleted: req.params.id });
	} catch (err) {
		return next(err);
	}
});

/** POST /rfq-items { rfq_item } =>  { rfq_item }
 *
 * rfq_item should be { rfq_id, item_code, quantity }
 *
 * Returns { id, rfq_id, item_code, quantity, item_cost, item_uom, item_description }
 */

router.post("/rfq-items", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		// Destructure the data from the request body
		const { rfq_id, company_id, item_code, quantity, item_description, item_cost } = req.body;

		// Validate that quantity is greater than 0
		if (quantity <= 0) {
			throw new BadRequestError("Quantity must be greater than 0.");
		}

		// Create the RFQ item in the database
		const rfqItem = await Rfq.createRfqItem({ rfq_id, company_id, item_code, quantity, item_description, item_cost });

		// Return the created RFQ item in the response
		return res.status(201).json({ rfqItem });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /rfq-items/[id] { quantity } => { rfqItem }
 *
 * Patches an RFQ item.
 *
 * Returns { id, rfq_id, item_code, quantity, item_cost, item_uom, item_description }
 *
 * Throws NotFoundError if RFQ item not found.
 */

router.patch("/rfq-items/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const rfqItem = await Rfq.updateRfqItem(req.params.id, req.body);
		return res.json({ rfqItem });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /rfq-items/[id]  =>  { deleted: id }
 *
 * Deletes an RFQ item.
 *
 * Throws NotFoundError if the RFQ item is not found.
 */

router.delete("/rfq-items/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		await Rfq.removeRfqItem(req.params.id);
		return res.json({ deleted: req.params.id });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
