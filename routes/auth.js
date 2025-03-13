"use strict";

/** Routes for authentication. */

const jsonschema = require("jsonschema");

const User = require("../models/user");
const express = require("express");
const router = new express.Router();
const { createToken } = require("../helpers/tokens");

/** POST /auth/token:  { email, password } => { token }
 *
 * Returns JWT token which can be used to authenticate further requests.
 *
 * Authorization required: none
 */

router.post("/token", async function (req, res, next) {
	try {
		const { email, password } = req.body;
		const user = await User.authenticate(email, password);
		const token = createToken(user);
		return res.json({ token });
	} catch (err) {
		return next(err);
	}
});

/** POST /auth/register:   { user } => { token }
 *
 * user must include { email, password, fullName }
 *
 * Returns JWT token which can be used to authenticate further requests.
 *
 * Authorization required: none
 */

router.post("/register", async function (req, res, next) {
	try {
		const newUser = await User.register({
			...req.body,
			phone: null,
			isAdmin: false,
		});
		const token = createToken(newUser);
		return res.status(201).json({ token });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
