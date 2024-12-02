import request from "supertest";
import { expect } from "chai";
import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

const baseUrl = 'https://airportgap.com';
const token = process.env.API_TOKEN; // Get the API token from environment variables

let favoriteIds = []; // To store IDs of created favorites

describe("API Tests for /favorites", function () {
  before(async function () {
    // Add 3 favorites before tests
    const airports = [
      { airport_id: "YBR", note: "My usual layover" },
      { airport_id: "LAX", note: "Vacation spot" },
      { airport_id: "ORD", note: "Business trips" },
    ];

    for (const airport of airports) {
      const response = await request(baseUrl)
        .post("/api/favorites")
        .send(airport)
        .set("Authorization", `Token ${token}`);

      if (response.status === 201) {
        favoriteIds.push(response.body.data.id); // Save created favorite ID
      } else {
        console.error("Failed to create favorite:", response.body);
      }
    }
  });

  after(async function () {
    // Optional cleanup
    const response = await request(baseUrl)
      .delete("/api/favorites/clear_all")
      .set("Authorization", `Token ${token}`);

    if (response.status !== 204) {
      console.error(
        "Failed to clear all favorites during cleanup:",
        response.body
      );
    }
  });

  describe("GET /api/favorites", function () {
    it("should return a list of favorites when given a valid token", async function () {
      const response = await request(baseUrl)
        .get("/api/favorites")
        .set("Authorization", `Token ${token}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property("data");
      expect(Array.isArray(response.body.data)).to.be.true;

      if (response.body.data.length > 0) {
        const favorite = response.body.data[0];
        expect(favorite).to.have.property("id");
        expect(favorite).to.have.property("type", "favorite");
        expect(favorite.attributes).to.have.property("airport");
        expect(favorite.attributes.airport).to.have.property("iata");
        expect(favorite.attributes.airport).to.have.property("name");
      } else {
        console.log("No favorites found");
      }
    });

    it("should return 401 when token is invalid or missing", async function () {
      const response = await request(baseUrl)
        .get("/api/favorites")
        .set("Authorization", "Token invalidToken");

      expect(response.status).to.equal(401);
    });

    it("should return 401 when no token is provided", async function () {
      const response = await request(baseUrl).get("/api/favorites");

      expect(response.status).to.equal(401);
    });
  });

  describe("POST /api/favorites", function () {
    it("should add a favorite and return the created favorite object", async function () {
      const payload = {
        airport_id: "JFK", // ID of the airport
        note: "My usual layover when visiting family", // Note for the favorite
      };

      const response = await request(baseUrl)
        .post("/api/favorites")
        .send(payload) // Send payload in the request body
        .set("Authorization", `Token ${token}`); // Set the Authorization header

      // Verify the response
      expect(response.status).to.equal(201); // Check if the response status is 201 (Created)
      expect(response.body).to.have.property("data"); // Response should contain 'data'

      const favorite = response.body.data;
      expect(favorite).to.have.property("id"); // Check the favorite has an 'id'
      expect(favorite).to.have.property("type", "favorite"); // Type should be 'favorite'
      expect(favorite.attributes).to.have.property("airport"); // Check 'airport' details
      expect(favorite.attributes.airport).to.have.property("iata", "JFK"); // Airport should match
      expect(favorite.attributes).to.have.property("note", payload.note); // Note should match
    });
  });

  describe("DELETE /api/favorites/:id", function () {
    let favoriteId;

    before(async function () {
      // Fetch an existing favorite
      const response = await request(baseUrl)
        .get("/api/favorites")
        .set("Authorization", `Token ${token}`);

      if (response.status === 200 && response.body.data.length > 0) {
        favoriteId = response.body.data[0].id; // Use the first favorite's ID
      } else {
        console.error("No favorites found; cannot proceed with delete test.");
      }
    });

    it("should delete a favorite and return 204 status", async function () {
      if (!favoriteId) {
        return console.warn(
          "Skipping test because no favoriteId is available."
        );
      }

      const response = await request(baseUrl)
        .delete(`/api/favorites/${favoriteId}`)
        .set("Authorization", `Token ${token}`);

      // Expect 204 No Content
      expect(response.status).to.equal(204);
      expect(response.body).to.deep.equal({});
    });
  });

  describe("DELETE /api/favorites/clear_all", function () {
    it("should delete all favorites and return 204 status", async function () {
      // Send the DELETE request to clear all favorites
      const response = await request(baseUrl)
        .delete("/api/favorites/clear_all")
        .set("Authorization", `Token ${token}`);

      // Expect 204 No Content
      expect(response.status).to.equal(204);
      expect(response.body).to.deep.equal({}); // Body should be empty

      // Verify all favorites are cleared by fetching the list
      const verifyResponse = await request(baseUrl)
        .get("/api/favorites")
        .set("Authorization", `Token ${token}`);

      // Expect the list of favorites to be empty
      expect(verifyResponse.status).to.equal(200);
      expect(verifyResponse.body).to.have.property("data");
      expect(verifyResponse.body.data).to.have.lengthOf(0); // No favorites should remain
    });

    it("should return 401 if the token is invalid or missing", async function () {
      // Test with no token
      const responseNoToken = await request(baseUrl).delete(
        "/api/favorites/clear_all"
      );
      expect(responseNoToken.status).to.equal(401);

      // Test with invalid token
      const responseInvalidToken = await request(baseUrl)
        .delete("/api/favorites/clear_all")
        .set("Authorization", "Token invalidToken");

      expect(responseInvalidToken.status).to.equal(401);
    });
  });

  describe("PATCH /api/favorites/:id", function () {
    let favoriteId;

    before(async function () {
      // Create a favorite to use for the PATCH test
      const payload = {
        airport_id: "YCB",
        note: "Original note for patch test",
      };

      const response = await request(baseUrl)
        .post("/api/favorites")
        .send(payload)
        .set("Authorization", `Token ${token}`);

      if (response.status === 201) {
        favoriteId = response.body.data.id; // Store the ID of the created favorite
      } else {
        console.error(
          "Failed to create favorite for PATCH test:",
          response.body
        );
      }
    });

    it("should update the note of a favorite and return the updated favorite object", async function () {
      if (!favoriteId) {
        return console.warn(
          "Skipping PATCH test because no favoriteId is available."
        );
      }

      const updatedNote = "Updated note for patch test";

      // Send the PATCH request to update the note
      const response = await request(baseUrl)
        .patch(`/api/favorites/${favoriteId}`)
        .send({ note: updatedNote })
        .set("Authorization", `Token ${token}`);

      // Verify the response
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property("data");

      const updatedFavorite = response.body.data;
      expect(updatedFavorite).to.have.property("id", favoriteId); // Ensure it's the correct favorite
      expect(updatedFavorite.attributes).to.have.property("note", updatedNote); // Note should be updated
    });

    it("should return 404 when trying to update a non-existent favorite", async function () {
      const response = await request(baseUrl)
        .patch("/api/favorites/nonexistentId")
        .send({ note: "This should not work" })
        .set("Authorization", `Token ${token}`);

      expect(response.status).to.equal(404); // Expect 404 Not Found
    });

    it("should return 401 when no token is provided", async function () {
      const response = await request(baseUrl)
        .patch(`/api/favorites/${favoriteId}`)
        .send({ note: "This should fail" });

      expect(response.status).to.equal(401); // Expect 401 Unauthorized
    });

    after(async function () {
      // Clean up by deleting the favorite created for the test
      if (favoriteId) {
        const response = await request(baseUrl)
          .delete(`/api/favorites/${favoriteId}`)
          .set("Authorization", `Token ${token}`);

        if (response.status !== 204) {
          console.error(
            "Failed to delete favorite after PATCH test:",
            response.body
          );
        }
      }
    });
  });
});
