const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

/** return signed JWT from user data. */

function createToken(user) {
	// Check if the user has the 'isAdmin' property defined
	if (user.isAdmin === undefined) {
		user.isAdmin = false; // Defaulting isAdmin to false if undefined
	}

	let payload = {
		id: user.id,
		isAdmin: user.isAdmin || false,
		companyId: user.companyId,
	};

	return jwt.sign(payload, SECRET_KEY);
}

module.exports = { createToken };
