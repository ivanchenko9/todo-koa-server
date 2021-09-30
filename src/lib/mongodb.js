import { MongoClient } from 'mongodb';

const mongoInit = async () => {
  const client = new MongoClient('mongodb://127.0.0.1:27017/todos');

  const connection = await client.connect();

  const db = connection.db();
  const dbTodoList = db.collection('todosList');
  const dbUsersList = db.collection('usersList');

  return { dbTodoList, dbUsersList };
};

export default mongoInit;
