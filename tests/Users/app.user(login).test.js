import { addTestUser, deleteTestUser } from '../mockFunction.js';
import request from 'supertest';
import { app } from '../../app.js';

const agent = request.agent(app.callback());

describe('POST /login', () => {
  beforeAll((done) => {
    addTestUser(agent, done);
  });

  test('User data is not valid', async () => {
    const response = await agent.post('/login').send({
      login: 'testsss',
      password: 'testsss',
    });
    expect(response.body).toEqual({
      error: 'User with such login does not exist!',
    });
    expect(response.status).toBe(400);
  });

  test('Password is not valid', async () => {
    const response = await agent.post('/login').send({
      login: 'test',
      password: 'testsss',
    });
    expect(response.body).toEqual({
      error: 'Password is incorrect',
    });
    expect(response.status).toBe(400);
  });

  test('User data is valid', async () => {
    const response = await agent.post('/login').send({
      login: 'test',
      password: 'test',
    });
    expect(response.body.token).toBeInstanceOf(String);
    expect(response.body.refreshToken).toBeInstanceOf(String);
    expect(response.status).toBe(200);
  });

  afterAll((done) => {
    deleteTestUser(agent, done);
  });
});
