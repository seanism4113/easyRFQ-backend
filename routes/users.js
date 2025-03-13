"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureCorrectUserOrAdmin, ensureAdmin } = require("../middleware/auth");
const User = require("../models/user");
const { createToken } = require("../helpers/tokens");
const bcrypt = require("bcrypt");

const router = express.Router();

/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { email, fullName, phone, isAdmin }, token }
 *
 * Authorization required: admin
 **/

router.post("/", ensureAdmin, async function (req, res, next) {
	try {
		const user = await User.register(req.body);
		const token = createToken(user);
		return res.status(201).json({ user, token });
	} catch (err) {
		return next(err);
	}
});

/** GET / => { users: [ {email, fullName, phone }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: admin
 **/

router.get("/", ensureAdmin, async function (req, res, next) {
	try {
		const users = await User.findAll();
		return res.json({ users });
	} catch (err) {
		return next(err);
	}
});

/** GET /[id] => { user }
 *
 * Returns { id, email, fullName, phone, isAdmin }
 *
 * Authorization required: admin or same user-as-:id
 **/

router.get("/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const user = await User.get(req.params.id);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /[id] { user } => { user }
 *
 * Data can include:
 *   { fullName, password, email, phone }
 *
 * Returns { id, email, fullName, phone, isAdmin }
 *
 * Authorization required: admin or same-user-as-:id
 **/

router.patch("/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		const user = await User.update(req.params.id, req.body);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization required: admin or same-user-as-:id
 **/

router.delete("/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
	try {
		await User.remove(req.params.id);
		return res.json({ deleted: req.params.id });
	} catch (err) {
		return next(err);
	}
});

/** POST /[id]/jobs/[id]  { state } => { application }
 *
 * Returns {"applied": jobId}
 *
 * Authorization required: admin or same-user-as-:id
 * */

router.patch("/:id/password", async (req, res, next) => {
	try {
		const { currentPassword, newPassword } = req.body;
		const userId = parseInt(req.params.id, 10); // Get the user ID from the URL parameter

		// Find the user by ID (including the password)
		const user = await User.get(userId);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		// Compare current password with the stored hash
		const isMatch = await bcrypt.compare(currentPassword, user.password);
		if (!isMatch) {
			return res.status(401).json({ error: "Current password is incorrect" });
		}

		// Hash the new password and update in DB
		const updatedUser = await User.update(userId, { password: newPassword });

		return res.json({ message: "Password updated successfully", user: updatedUser });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
