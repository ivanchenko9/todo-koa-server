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

  await sequelize.authenticate();
  console.log('Connection has been established successfully.');

  dbData = {
    sequelize: sequelize,
    users: usersTab(sequelize),
    todos: todosTab(sequelize),
    tokens: tokensTab(sequelize),
  };

  dbData.users.hasMany(dbData.todos);
  dbData.users.hasMany(dbData.tokens);

  dbData.todos.belongsTo(dbData.users);
  dbData.tokens.belongsTo(dbData.users);
} catch (error) {
  console.error('Unable to connect to the database:', error);
}

export default dbData;
