import { request, expect } from "./config.js";
import dotenv from "dotenv";
dotenv.config();

const token = process.env.API_TOKEN; // Get the API token from environment variables

describe("POST /favorites", function () {
  it("requires authentication", async function () {
    const response = await request.post("/favorites").send({
      airport_id: "YBR",
      note: "Going to Canada",
    });

    expect(response.status).to.eql(401);
  });

  it("allows a user to get their favorite airports", async function () {
    const postResponse = await request
      .get("/favorites")
      .set("Authorization", `Bearer ${token}`); // Use the token variable here
    expect(postResponse.status).to.eql(200);
  });

  it("allows a user to save and delete their favorite airports", async function () {
    const postResponse = await request
      .post("/favorites")
      .set("Authorization", `Bearer ${token}`) // Use the token variable here
      .send({
        airport_id: "YBR",
        note: "Going to Canada",
      });

    expect(postResponse.status).to.eql(201);
    expect(postResponse.body.data.attributes.airport.name).to.eql(
      "Brandon Municipal Airport"
    );
    expect(postResponse.body.data.attributes.note).to.eql("Going to Canada");

    const favoriteId = postResponse.body.data.id;

    const putResponse = await request
      .put(`/favorites/${favoriteId}`)
      .set("Authorization", `Bearer ${token}`) // Use the token variable here
      .send({
        note: "My usual layover when visiting family and friends",
      });

    expect(putResponse.status).to.eql(200);
    expect(putResponse.body.data.attributes.note).to.eql(
      "My usual layover when visiting family and friends"
    );

    const deleteResponse = await request
      .delete(`/favorites/${favoriteId}`)
      .set("Authorization", `Bearer ${token}`); // Use the token variable here

    expect(deleteResponse.status).to.eql(204);

    const getResponse = await request
      .get(`/favorites/${favoriteId}`)
      .set("Authorization", `Bearer ${token}`); // Use the token variable here

    expect(getResponse.status).to.eql(404);
  });
  
  after(async function () {
    // Optional cleanup
    const response = await request
      .delete("/favorites/clear_all")
      .set("Authorization", `Token ${token}`);

    if (response.status !== 204) {
      console.error(
        "Failed to clear all favorites during cleanup:",
        response.body
      );
    }
  });
  
});
