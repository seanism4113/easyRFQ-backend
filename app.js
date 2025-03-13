"use strict";

/** Express app for EasyRFQ. */

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path"); // Import path module to handle file paths

const { NotFoundError } = require("./expressError");
const { authenticateJWT } = require("./middleware/auth");

// Import route handlers
const authRoutes = require("./routes/auth");
const companysRoutes = require("./routes/companies");
const customersRoutes = require("./routes/customers");
const usersRoutes = require("./routes/users");
const itemsRoutes = require("./routes/items");
const rfqsRoutes = require("./routes/rfqs");
const quotesRoutes = require("./routes/quotes");

const app = express();

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Log HTTP requests in a tiny format
app.use(morgan("tiny"));

// Middleware to authenticate user JWTs on each request
app.use(authenticateJWT);

// Register route handlers
app.use("/auth", authRoutes);
app.use("/companies", companysRoutes);
app.use("/customers", customersRoutes);
app.use("/users", usersRoutes);
app.use("/items", itemsRoutes);
app.use("/rfqs", rfqsRoutes);
app.use("/quotes", quotesRoutes);

// Serve static files from the 'dist' folder (for production builds)
app.use(express.static(path.join(__dirname, "dist")));

// Catch-all route to serve index.html for any non-static request (SPA routing)
app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "dist", "index.html"));
});

/** Handle 404 errors -- this matches all unmatched routes */
app.use(function (req, res, next) {
	return next(new NotFoundError());
});

/** Generic error handler; logs stack trace in non-test environments */
app.use(function (err, req, res, next) {
	if (process.env.NODE_ENV !== "test") console.error(err.stack);

	const status = err.status || 500;
	const message = err.message;

	return res.status(status).json({
		error: { message, status },
	});
});

// Export app for use in server.js or testing
module.exports = app;
