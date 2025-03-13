"use strict";

/** Routes for items. */

const express = require("express");

const { BadRequestError, NotFoundError } = require("../expressError");
const { ensureCorrectUserOrAdmin } = require("../middleware/auth");
const Item = require("../models/item");

const router = new express.Router();

/** POST / { item } => { item }
 *
 * item should be { companyId, itemCode, description, uom, cost }
 *
 * Returns { companyId, itemCode, description, uom, cost }
 */

router.post("/", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const item = await Item.create(req.body);
		return res.status(201).json({ item });
	} catch (err) {
		return next(err);
	}
});

/** GET /  =>
 *   { items: [ { companyId, itemCode, description, uom, cost }, ...] }
 */

router.get("/", ensureCorrectUserOrAdmin, async function (req, res, next) {
	const { companyId } = req.query; // Extract companyId from query params
	const searchFilters = req.query;

	if (!companyId) {
		return next(new BadRequestError("companyId is required"));
	}

	try {
		const items = await Item.findAll(companyId, searchFilters); // Pass companyId and filters
		return res.json({ items });
	} catch (err) {
		return next(err);
	}
});

/** GET /item/:itemCode  =>  { item }
 *
 * Item is { companyId, itemCode, description, uom, cost }
 */

router.get("/item/:itemCode", ensureCorrectUserOrAdmin, async function (req, res, next) {
	const { itemCode } = req.params;
	const { companyId } = req.query; // Extract companyId from query params

	if (!companyId) {
		return res.status(400).json({ error: "companyId is required" });
	}

	try {
		const item = await Item.get(companyId, itemCode); // Pass companyId and itemCode to get the item
		return res.json({ item });
	} catch (err) {
		return next(err);
	}
});

/** GET /count?companyId=xyz => { count: number }
 *
 * Returns the total number of items for a given company.
 */

router.get("/count", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const { companyId } = req.query;
		if (!companyId) throw new BadRequestError("companyId is required");
		const count = await Item.getItemCount(companyId); // Pass companyId to get count
		return res.json({ count });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /item/:itemCode { fld1, fld2, ... } => { item }
 *
 * Patches item data.
 *
 * fields can be: { description, uom, cost }
 *
 * Returns { companyId, itemCode, description, uom, cost }
 */

router.patch("/item/:itemCode", ensureCorrectUserOrAdmin, async function (req, res, next) {
	const { companyId } = req.query;
	const { itemCode } = req.params;

	if (!companyId) {
		return next(new BadRequestError("companyId is required"));
	}

	try {
		const item = await Item.update(companyId, itemCode, req.body); // Pass companyId and itemCode to update the item
		return res.json({ item });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /item/:itemCode  =>  { deleted: itemCode }
 *
 */

router.delete("/item/:itemCode", ensureCorrectUserOrAdmin, async function (req, res, next) {
	const { companyId } = req.query; // Extract companyId from query params
	const { itemCode } = req.params;

	if (!companyId) {
		return next(new BadRequestError("companyId is required"));
	}

	try {
		const result = await Item.remove(companyId, itemCode); // Pass companyId and itemCode to remove the item
		return res.json({ deleted: itemCode });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
