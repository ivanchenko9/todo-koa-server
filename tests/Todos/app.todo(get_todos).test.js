import request from 'supertest';
import { app } from '../../app.js';

const agent = request.agent(app.callback());

describe('GET /todos', () => {
  test('Missing userId', async () => {
    const response = await agent.get('/todos');
    expect(response.status).toBe(401);
  });
});
