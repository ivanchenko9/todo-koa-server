import Sequelize from 'sequelize';
import todosTab from './Todos.js';
import usersTab from './Users.js';
import tokensTab from './Tokens.js';

let dbData = {};

try {
  const sequelize = new Sequelize('todo_db', 'root', 'Great123', {
    dialect: 'mariadb',
    host: 'localhost',
  });

  const Todos = todosTab(sequelize);
  const Users = usersTab(sequelize);
  const Tokens = tokensTab(sequelize);

  await sequelize.authenticate();
  console.log('Connection has been established successfully.');

  dbData = {
    sequelize: sequelize,
    users: Users,
    todos: Todos,
    tokens: Tokens,
  };
} catch (error) {
  console.error('Unable to connect to the database:', error);
}

export default dbData;
