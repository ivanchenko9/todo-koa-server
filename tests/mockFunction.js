export const addTestUser = async (agent, done) => {
  const response = await agent.post('/registration').send({
    email: 'test@test.com',
    login: 'test',
    password: 'test',
  });
  done();
};

export const deleteTestUser = async (agent, done) => {
  const response = await agent.post('/delete').send({
    login: 'test',
  });
  done();
};
