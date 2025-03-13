"use strict";

/** Database setup for easyRFQ */

const { Client } = require("pg");
const { getDatabaseUri } = require("./config");

let db;

/** Determine database connection settings based on environment */
if (process.env.NODE_ENV === "production") {
	// In production, use SSL for secure database connections
	db = new Client({
		connectionString: getDatabaseUri(),
		ssl: {
			rejectUnauthorized: true, // Allows self-signed certificates (e.g., Heroku)
		},
	});
} else {
	// In development or test environments, no SSL is needed
	db = new Client({
		connectionString: getDatabaseUri(),
	});
}

// Connect to the database
db.connect();

module.exports = db;
