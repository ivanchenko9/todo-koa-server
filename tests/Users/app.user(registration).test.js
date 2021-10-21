import { addTestUser, deleteTestUser } from '../mockFunction.js';
import request from 'supertest';
import { app } from '../../app.js';

const agent = request.agent(app.callback());

describe('POST /registration', () => {
  beforeAll((done) => {
    addTestUser(agent, done);
  });

  test('Given email, login, password and it`s original (not valid data)', async () => {
    const response = await agent.post('/registration').send({
      email: 'example',
      login: 'example',
      password: 'example',
    });
    expect(response.body).toEqual({ message: 'Users data is incorrect!' });
    expect(response.status).toBe(400);
  });

  test('Given email, login, password and it`s original(valid data)', async () => {
    const response = await agent.post('/registration').send({
      email: 'example@example.com',
      login: 'example',
      password: 'example',
    });

    expect(response.body).toEqual({
      isActive: true,
      role: true,
      email: 'example@example.com',
      login: 'example',
    });
    expect(response.status).toBe(201);
  });

  test('Given email, login, password ,but user with such login is already exist (valid data)', async () => {
    const response = await agent.post('/registration').send({
      email: 'test@test.com',
      login: 'test',
      password: 'test',
    });
    expect(response.body).toEqual({
      error: 'User with such login is already exist!',
    });
    expect(response.status).toBe(400);
  });

  afterAll((done) => {
    deleteTestUser(agent, done);
  });
});
