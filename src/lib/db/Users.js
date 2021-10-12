import Sequelize from 'sequelize';

export default function (sequelize) {
  return sequelize.define(
    'users',
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      login: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      role: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.BIGINT,
      },
    },
    {
      timestamps: false,
    },
  );
}
