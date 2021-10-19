import { describe, test } from 'jest-circus';
import supertest from 'supertest';
import httpServer from './app.js';

describe('GET /todos', () => {
  describe('Given userId', () => {
    // should return to user his todos in array
    test("should respond with a 200 status code", async () => {
        const responce = await 
    })
  });

  describe('Missing userId', () => {
    // should respond with a 500 status code
  });
});
