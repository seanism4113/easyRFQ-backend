"use strict";

/** Routes for quotes. */

const express = require("express");
const { BadRequestError } = require("../expressError");
const { ensureCorrectUserOrAdmin } = require("../middleware/auth");
const Quote = require("../models/quote");

const router = new express.Router();

/** POST / { quote } =>  { quote }
 *
 * quote should be { company_id, customer_name, user_id, quote_number }
 *
 * Returns { id, company_id, customer_name, user_id, quote_number, created_at }
 */

router.post("/", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const quote = await Quote.create(req.body);
		return res.status(201).json({ quote });
	} catch (err) {
		return next(err);
	}
});

/** GET /  =>
 *   { quotes: [ { id, company_id, customer_name, user_id, quote_number, created_at, quote_total }, ...] }
 */

router.get("/", ensureCorrectUserOrAdmin, async function (req, res, next) {
	const { companyId, userId, id } = req.query;

	const searchFilters = { companyId, userId, id };

	try {
		const quotes = await Quote.findAll(searchFilters);
		return res.json({ quotes });
	} catch (err) {
		return next(err);
	}
});

/** GET /[id]  =>  { quote } */

router.get("/quote/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const quote = await Quote.get(req.params.id);
		return res.json({ quote });
	} catch (err) {
		return next(err);
	}
});

/** GET /count?userId=xyz => { count: number } */

router.get("/count", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const { userId, companyId } = req.query;

		if (!userId && !companyId) {
			throw new BadRequestError("Either userId or companyId is required");
		}

		const count = await Quote.getQuoteCount(userId, companyId);
		return res.json({ count });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /[id] { customer_name, user_id, company_id, quote_number } => { quote } */

router.patch("/quote/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const quote = await Quote.update(req.params.id, req.body);
		return res.json({ quote });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[id]  =>  { deleted: id } */

router.delete("/quote/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		await Quote.remove(req.params.id);
		return res.json({ deleted: req.params.id });
	} catch (err) {
		return next(err);
	}
});

/** POST /quote-items { quote_item } =>  { quote_item } */

router.post("/quote-items", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const { quote_id, company_id, item_code, quantity, item_description, item_price } = req.body;

		if (quantity <= 0) {
			throw new BadRequestError("Quantity must be greater than 0.");
		}

		const quoteItem = await Quote.createQuoteItem({ quote_id, company_id, item_code, quantity, item_description, item_price });
		return res.status(201).json({ quoteItem });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /quote-items/[id] { quantity } => { quoteItem } */

router.patch("/quote-items/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const quoteItem = await Quote.updateQuoteItem(req.params.id, req.body);
		return res.json({ quoteItem });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /quote-items/[id]  =>  { deleted: id } */

router.delete("/quote-items/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		await Quote.removeQuoteItem(req.params.id);
		return res.json({ deleted: req.params.id });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
