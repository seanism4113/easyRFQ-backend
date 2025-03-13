"use strict";

const request = require("supertest");
const db = require("../db.js");
const app = require("../app");
const User = require("../models/user");

const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll, adminToken, userToken } = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /users */

describe("POST /users", function () {
	test("works for admins: create non-admin", async function () {
		const resp = await request(app)
			.post("/users")
			.send({
				email: "newuser@example.com",
				password: "password123",
				fullName: "New User",
				phone: "123-456-7890",
				isAdmin: false,
				companyId: 1,
			})
			.set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(201);
		expect(resp.body).toEqual({
			user: {
				id: expect.any(Number),
				email: "newuser@example.com",
				fullName: "New User",
				phone: "123-456-7890",
				isAdmin: false,
				companyId: 1,
			},
			token: expect.any(String),
		});
	});

	test("unauthorized for non-admin users", async function () {
		const resp = await request(app)
			.post("/users")
			.send({
				email: "newuser@example.com",
				password: "password123",
				fullName: "New User",
				phone: "123-456-7890",
				isAdmin: false,
				companyId: 1,
			})
			.set("authorization", `Bearer ${userToken}`);
		expect(resp.statusCode).toEqual(401);
	});

	test("bad request with missing data", async function () {
		const resp = await request(app).post("/users").send({ email: "bad@example.com" }).set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});
});

/************************************** GET /users */

describe("GET /users", function () {
	test("works for admins", async function () {
		const resp = await request(app).get("/users").set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body.users).toBeInstanceOf(Array);
	});

	test("unauthorized for non-admin users", async function () {
		const resp = await request(app).get("/users").set("authorization", `Bearer ${userToken}`);
		expect(resp.statusCode).toEqual(401);
	});
});

/************************************** GET /users/:id */

describe("GET /users/:id", function () {
	test("works for correct user or admin", async function () {
		const resp = await request(app).get("/users/1").set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body.user).toHaveProperty("email");
	});

	test("unauthorized for another user", async function () {
		const resp = await request(app).get("/users/1").set("authorization", `Bearer ${userToken}`);
		expect(resp.statusCode).toEqual(401);
	});
});

/************************************** PATCH /users/:id */

describe("PATCH /users/:id", function () {
	test("works for correct user or admin", async function () {
		const resp = await request(app).patch("/users/1").send({ fullName: "Updated User" }).set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body.user.fullName).toEqual("Updated User");
	});

	test("unauthorized for another user", async function () {
		const resp = await request(app).patch("/users/1").send({ fullName: "Hacker" }).set("authorization", `Bearer ${userToken}`);
		expect(resp.statusCode).toEqual(401);
	});
});

/************************************** DELETE /users/:id */

describe("DELETE /users/:id", function () {
	test("works for admin", async function () {
		const resp = await request(app).delete("/users/1").set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body).toEqual({ deleted: "1" });
	});

	test("unauthorized for another user", async function () {
		const resp = await request(app).delete("/users/1").set("authorization", `Bearer ${userToken}`);
		expect(resp.statusCode).toEqual(401);
	});
});
