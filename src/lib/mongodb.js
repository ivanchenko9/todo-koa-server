import { MongoClient } from 'mongodb';
import config from './config.js';

const mongoInit = async () => {
  const client = new MongoClient(config.mongoURI);

  const connection = await client.connect();

  const db = connection.db();
  const dbTodoList = db.collection('todosList');
  const dbUsersList = db.collection('usersList');
  const dbTokenList = db.collection('tokenList');

  return { dbTodoList, dbUsersList, dbTokenList };
};

export default mongoInit;
