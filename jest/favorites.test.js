const request = require('supertest');
require('dotenv').config(); // Load environment variables from .env file

const baseUrl = 'https://airportgap.com';
const token = process.env.API_TOKEN; // Get the API token from environment variables

let favoriteIds = []; // To store IDs of created favorites

beforeAll(async () => {
  // Add 3 favorites before tests
  const airports = [
    { airport_id: 'YBR', note: 'My usual layover' },
    { airport_id: 'LAX', note: 'Vacation spot' },
    { airport_id: 'ORD', note: 'Business trips' },
  ];

  for (const airport of airports) {
    const response = await request(baseUrl)
      .post('/api/favorites')
      .send(airport)
      .set('Authorization', `Token ${token}`);

    if (response.status === 201) {
      favoriteIds.push(response.body.data.id); // Save created favorite ID
    } else {
      console.error('Failed to create favorite:', response.body);
    }
  }
});

afterAll(async () => {
  // Optional cleanup
  const response = await request(baseUrl)
    .delete('/api/favorites/clear_all')
    .set('Authorization', `Token ${token}`);
  
  if (response.status !== 204) {
    console.error('Failed to clear all favorites during cleanup:', response.body);
  }
});

describe('GET /api/favorites', () => {
  it('should return a list of favorites when given a valid token', async () => {
    const response = await request(baseUrl) // Use the base URL variable
      .get('/api/favorites')
      .set('Authorization', `Token ${token}`); // Set the Authorization header

      expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);

    if (response.body.data.length > 0) {
      const favorite = response.body.data[0];
      expect(favorite).toHaveProperty('id');
      expect(favorite).toHaveProperty('type', 'favorite');
      expect(favorite.attributes).toHaveProperty('airport');
      expect(favorite.attributes.airport).toHaveProperty('iata');
      expect(favorite.attributes.airport).toHaveProperty('name');
    } else {
      console.log('No favorites found');
    }
  });

  it('should return 401 when token is invalid or missing', async () => {
    const response = await request(baseUrl)
      .get('/api/favorites')
      .set('Authorization', 'Token invalidToken');

    expect(response.status).toBe(401);
  });

  it('should return 401 when no token is provided', async () => {
    const response = await request(baseUrl)
      .get('/api/favorites');

    expect(response.status).toBe(401);
  });
});

describe('POST /api/favorites', () => {
  it('should add a favorite and return the created favorite object', async () => {
    const payload = {
      airport_id: 'JFK', // ID of the airport
      note: 'My usual layover when visiting family', // Note for the favorite
    };

    const response = await request(baseUrl)
      .post('/api/favorites')
      .send(payload) // Send payload in the request body
      .set('Authorization', `Token ${token}`); // Set the Authorization header

    // Verify the response
    expect(response.status).toBe(201); // Check if the response status is 201 (Created)
    expect(response.body).toHaveProperty('data'); // Response should contain 'data'

    const favorite = response.body.data;
    expect(favorite).toHaveProperty('id'); // Check the favorite has an 'id'
    expect(favorite).toHaveProperty('type', 'favorite'); // Type should be 'favorite'
    expect(favorite.attributes).toHaveProperty('airport'); // Check 'airport' details
    expect(favorite.attributes.airport).toHaveProperty('iata', 'JFK'); // Airport should match
    expect(favorite.attributes).toHaveProperty('note', payload.note); // Note should match
  });
});


describe('DELETE /api/favorites/:id', () => {
  let favoriteId;

  beforeAll(async () => {
    // Fetch an existing favorite
    const response = await request(baseUrl)
      .get('/api/favorites')
      .set('Authorization', `Token ${token}`);
    
    if (response.status === 200 && response.body.data.length > 0) {
      favoriteId = response.body.data[0].id; // Use the first favorite's ID
    } else {
      console.error('No favorites found; cannot proceed with delete test.');
    }
  });

  it('should delete a favorite and return 204 status', async () => {
    if (!favoriteId) {
      return console.warn('Skipping test because no favoriteId is available.');
    }

    const response = await request(baseUrl)
      .delete(`/api/favorites/${favoriteId}`)
      .set('Authorization', `Token ${token}`);

    // Expect 204 No Content
    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
  });
});


describe('DELETE /api/favorites/clear_all', () => {
  it('should delete all favorites and return 204 status', async () => {
    // Send the DELETE request to clear all favorites
    const response = await request(baseUrl)
      .delete('/api/favorites/clear_all')
      .set('Authorization', `Token ${token}`); // Set the Authorization header

    // Expect 204 No Content
    expect(response.status).toBe(204);
    expect(response.body).toEqual({}); // Body should be empty

    // Verify all favorites are cleared by fetching the list
    const verifyResponse = await request(baseUrl)
      .get('/api/favorites')
      .set('Authorization', `Token ${token}`);

    // Expect the list of favorites to be empty
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body).toHaveProperty('data');
    expect(verifyResponse.body.data).toHaveLength(0); // No favorites should remain
  });

  it('should return 401 if the token is invalid or missing', async () => {
    // Test with no token
    const responseNoToken = await request(baseUrl).delete('/api/favorites/clear_all');
    expect(responseNoToken.status).toBe(401);

    // Test with invalid token
    const responseInvalidToken = await request(baseUrl)
      .delete('/api/favorites/clear_all')
      .set('Authorization', 'Token invalidToken');

    expect(responseInvalidToken.status).toBe(401);
  });
});

describe('PATCH /api/favorites/:id', () => {
  let favoriteId;

  beforeAll(async () => {
    // Create a favorite to use for the PATCH test
    const payload = {
      airport_id: 'YCB',
      note: 'Original note for patch test',
    };

    const response = await request(baseUrl)
      .post('/api/favorites')
      .send(payload)
      .set('Authorization', `Token ${token}`);

    if (response.status === 201) {
      favoriteId = response.body.data.id; // Store the ID of the created favorite
    } else {
      console.error('Failed to create favorite for PATCH test:', response.body);
    }
  });

  it('should update the note of a favorite and return the updated favorite object', async () => {
    if (!favoriteId) {
      return console.warn('Skipping PATCH test because no favoriteId is available.');
    }

    const updatedNote = 'Updated note for patch test';

    // Send the PATCH request to update the note
    const response = await request(baseUrl)
      .patch(`/api/favorites/${favoriteId}`)
      .send({ note: updatedNote })
      .set('Authorization', `Token ${token}`);

    // Verify the response
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');

    const updatedFavorite = response.body.data;
    expect(updatedFavorite).toHaveProperty('id', favoriteId); // Ensure it's the correct favorite
    expect(updatedFavorite.attributes).toHaveProperty('note', updatedNote); // Note should be updated
  });

  it('should return 404 when trying to update a non-existent favorite', async () => {
    const response = await request(baseUrl)
      .patch('/api/favorites/nonexistentId')
      .send({ note: 'This should not work' })
      .set('Authorization', `Token ${token}`);

    expect(response.status).toBe(404); // Expect 404 Not Found
  });

  it('should return 401 when no token is provided', async () => {
    const response = await request(baseUrl)
      .patch(`/api/favorites/${favoriteId}`)
      .send({ note: 'This should fail' });

    expect(response.status).toBe(401); // Expect 401 Unauthorized
  });

  afterAll(async () => {
    // Clean up by deleting the favorite created for the test
    if (favoriteId) {
      const response = await request(baseUrl)
        .delete(`/api/favorites/${favoriteId}`)
        .set('Authorization', `Token ${token}`);
      
      if (response.status !== 204) {
        console.error('Failed to delete favorite after PATCH test:', response.body);
      }
    }
  });
});
