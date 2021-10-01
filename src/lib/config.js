export default {
  port: process.env.PORT || 3000,
  mongoURI: 'mongodb://127.0.0.1:27017/todos',
  secret: process.env.SECRET || 'secret',
};
