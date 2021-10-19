import Router from 'koa-router';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'koa-passport';
import config from '../lib/config.js';
import db from '../lib/db/index.js';
import pkg from 'sequelize';
import {
  GOT_TODOS,
  NEW_TODO_ADDED,
  TODO_UPDATED,
  TODO_DELETED,
  DONE_WERE_CLEARED,
  CHANGE_IS_CONFIRMED_ALL_STATUS_CHANGED,
} from './socketTypes.js';

const router = new Router();
const Users = db.users;
const Todos = db.todos;
const Tokens = db.tokens;
const { Op } = pkg;

function validationUsersData(email, login, password) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!re.test(String(email).toLowerCase())) {
    console.log('Email is incorrect!');
    return false;
  }
  if (login.length < 4 || login.length > 15) {
    console.log('Login is incorrect!');
    return false;
  }
  if (password.length < 4 || password.length > 20) {
    console.log('Password is incorrect!');
    return false;
  }
  return true;
}

async function sendDataToClient(userId) {
  const searchedTodos = await Todos.findAll({
    where: {
      userId: userId,
    },
  });
  return searchedTodos;
}

const completeAllTasks = async (requestedStatus, arrWithId, userId) => {
  let updateManyTodos;
  if (requestedStatus === true) {
    for (const id of arrWithId) {
      updateManyTodos = await Todos.update(
        { isCompleted: true, updatedAt: Date.now() },
        {
          where: {
            id: id,
            userId: userId,
          },
        },
      );
    }
  } else if (requestedStatus === false) {
    for (const id of arrWithId) {
      updateManyTodos = await Todos.update(
        { isCompleted: false, updatedAt: Date.now() },
        {
          where: {
            id: id,
            userId: userId,
          },
        },
      );
    }
  }
  return updateManyTodos;
};

const routeInit = async () => {
  router.get(
    '/todos',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { user } = ctx.state;
      ctx.body = await sendDataToClient(user.id);
      ctx.status = 200;
      const body = {
        type: GOT_TODOS,
        payload: ctx.body,
      };

      ctx.socketSend(user.id, body);
    },
  );

  router.post(
    '/todos',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { id, title, isCompleted } = ctx.request.body;
      const { user } = ctx.state;
      const createdTodo = await Todos.create({
        id: id,
        title: title,
        isCompleted: isCompleted,
        createdAt: Date.now(),
        userId: user.id,
      });
      ctx.body = await sendDataToClient(user.id);

      ctx.status = 201;
      const body = {
        type: NEW_TODO_ADDED,
        payload: ctx.body,
      };
      ctx.socketSend(user.id, body);
    },
  );

  router.patch(
    '/todos',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { id, isCompleted } = ctx.request.body;
      const { user } = ctx.state;
      const updatedTodo = await Todos.update(
        { isCompleted: isCompleted, updatedAt: Date.now() },
        {
          where: {
            [Op.and]: [{ id: id }, { userId: user.id }],
          },
        },
      );
      ctx.body = await sendDataToClient(user.id);
      ctx.status = 200;

      const body = {
        type: TODO_UPDATED,
        payload: ctx.body,
      };
      ctx.socketSend(user.id, body);
    },
  );

  router.delete(
    '/todos/:id',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { user } = ctx.state;
      const deletedTodo = await Todos.destroy({
        where: {
          [Op.and]: [
            { id: Number(ctx.request.params.id) },
            { userId: user.id },
          ],
        },
      });
      ctx.body = await sendDataToClient(user.id);
      ctx.status = 200;

      const body = {
        type: TODO_DELETED,
        payload: ctx.body,
      };
      ctx.socketSend(user.id, body);
    },
  );

  router.delete(
    '/todos',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { user } = ctx.state;
      const deletedTodos = await Todos.destroy({
        where: {
          [Op.and]: [{ isCompleted: true }, { userId: user.id }],
        },
      });
      ctx.body = await sendDataToClient(user.id);
      ctx.status = 200;

      const body = {
        type: DONE_WERE_CLEARED,
        payload: ctx.body,
      };
      ctx.socketSend(user.id, body);
    },
  );

  router.post(
    '/todos/bulkupdate',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { isCompletedAll, todosIdToUpdate } = ctx.request.body;
      const { user } = ctx.state;
      const completeAllTodos = await completeAllTasks(
        isCompletedAll,
        todosIdToUpdate,
        user.id,
      );
      ctx.body = await sendDataToClient(user.id);
      ctx.status = 200;

      const body = {
        type: CHANGE_IS_CONFIRMED_ALL_STATUS_CHANGED,
        payload: ctx.body,
      };
      ctx.socketSend(user.id, body);
    },
  );

  router.post('/registration', async (ctx) => {
    const { email, login, password } = ctx.request.body;
    if (validationUsersData(email, login, password)) {
      const user = await Users.findAll({
        where: {
          login: login,
        },
      });
      if (user.length > 0) {
        ctx.throw(400, 'User with such login is already exist!');
      }
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const newUser = await Users.create({
        email: email,
        login: login,
        password: hash,
        createdAt: Date.now(),
      });

      ctx.body = newUser;
      ctx.status = 201;
    } else {
      ctx.body = { message: 'Users data is incorrect!' };
      ctx.status = 400;
    }
  });

  router.post('/login', async (ctx) => {
    const { login, password } = ctx.request.body;
    const user = await Users.findAll({
      where: {
        login: login,
      },
    });
    if (user.length === 0) {
      ctx.throw(400, 'User with such does not exist!');
    }

    const isMatch = await bcrypt.compare(password, user[0].password);
    if (isMatch) {
      const payload = {
        id: user[0].id,
        login: user[0].login,
        email: user[0].email,
      };

      const accessToken = jwt.sign(payload, config.secret, {
        expiresIn: '30m',
      });
      const refreshToken = jwt.sign(payload, config.secretRefresh, {
        expiresIn: '30d',
      });
      const userWithToken = await Tokens.findAll({
        where: {
          [Op.and]: [{ userId: payload.id }, { socketId: ctx.socketId }],
        },
      });
      if (userWithToken.length > 0) {
        const updatedToken = await Tokens.update(
          { refreshToken: refreshToken },
          {
            where: {
              [Op.and]: [{ userId: payload.id }, { socketId: ctx.socketId }],
            },
          },
        );
      } else {
        const createdToken = await Tokens.create({
          userId: payload.id,
          socketId: ctx.socketId,
          refreshToken: refreshToken,
        });
      }
      ctx.body = {
        token: `Bearer ${accessToken}`,
        refreshToken,
      };
    } else {
      ctx.throw(400, 'Password is incorrect');
    }
  });

  router.post(
    '/logout',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { user } = ctx.state;
      const id = ctx.request.body.id;
      const logoutInfo = await Tokens.destroy({
        where: {
          [Op.and]: [{ userId: id }, { socketId: ctx.socketId }],
        },
      });

      ctx.body = logoutInfo;
      ctx.status = 200;
      ctx.socketLeave(user.id);
      // socket.leave(user.id);
    },
  );

  router.post('/refresh', async (ctx) => {
    const refreshToken = ctx.request.body.refreshToken;
    if (refreshToken) {
      try {
        const verified = jwt.verify(refreshToken, config.secretRefresh);
        const usersToken = await Tokens.findAll({
          where: {
            [Op.and]: [
              { refreshToken: refreshToken },
              { socketId: ctx.socketId },
            ],
          },
        });
        if (verified && usersToken.length > 0) {
          const decodeToken = jwt.decode(refreshToken);
          const searchedUser = await Users.findAll({
            where: {
              login: decodeToken.login,
            },
          });

          const payload = {
            id: searchedUser[0].id,
            login: searchedUser[0].login,
            email: searchedUser[0].email,
          };

          const accessToken = jwt.sign(payload, config.secret, {
            expiresIn: '30m',
          });
          const newRefreshToken = jwt.sign(payload, config.secretRefresh, {
            expiresIn: '30d',
          });

          const updatedToken = await Tokens.update(
            { refreshToken: newRefreshToken },
            {
              where: {
                [Op.and]: [
                  { refreshToken: refreshToken },
                  { socketId: ctx.socketId },
                ],
              },
            },
          );

          ctx.body = {
            token: `Bearer ${accessToken}`,
            refreshToken: newRefreshToken,
          };
          ctx.status = 201;
        } else {
          ctx.throw(401, 'Unauthorized');
        }
      } catch (error) {
        console.error(error);
        ctx.throw(400, 'Cannot refresh');
      }
    } else {
      ctx.throw(400, 'Refresh token is incorrect');
    }
  });

  return router;
};

export default routeInit;
