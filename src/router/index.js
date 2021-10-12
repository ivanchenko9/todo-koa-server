import Router from 'koa-router';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'koa-passport';
import config from '../lib/config.js';
import db from '../lib/db/index.js';
import pkg from 'sequelize';

const router = new Router();
const Users = db.users;
const Todos = db.todos;
const Tokens = db.tokens;
const { Op } = pkg;

async function sendDataToClient(userId) {
  const searchedTodos = await Todos.findAll({
    where: {
      userId: userId,
    },
  });
  return searchedTodos;
}

const completeAllTasks = async (requestedStatus, userId) => {
  let updateManyTodos;
  if (requestedStatus === true) {
    updateManyTodos = await Todos.update(
      { isCompleted: true },
      {
        where: {
          userId: userId,
        },
      },
    );
  } else if (requestedStatus === false) {
    updateManyTodos = await Todos.update(
      { isCompleted: false },
      {
        where: {
          userId: userId,
        },
      },
    );
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
        userId: user.id,
      });

      ctx.body = await sendDataToClient(user.id);
      ctx.status = 201;
    },
  );

  router.patch(
    '/todos/update',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { id, isCompleted } = ctx.request.body;
      const { user } = ctx.state;
      const updatedTodo = await Todos.update(
        { isCompleted: isCompleted },
        {
          where: {
            [Op.and]: [{ id: id }, { userId: user.id }],
          },
        },
      );
      ctx.body = await sendDataToClient(user.id);
      ctx.status = 200;
    },
  );

  router.delete(
    '/todos/delete',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { user } = ctx.state;
      const deletedTodo = await Todos.destroy({
        where: {
          [Op.and]: [{ id: Number(ctx.request.query.id) }, { userId: user.id }],
        },
      });
      ctx.body = await sendDataToClient(user.id);
      ctx.status = 200;
    },
  );

  router.delete(
    '/todos/cleardone',
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
    },
  );

  router.patch(
    '/todos/completeall',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { isCompletedAll } = ctx.request.body;
      const { user } = ctx.state;
      const completeAllTodos = await completeAllTasks(isCompletedAll, user.id);
      ctx.body = await sendDataToClient(user.id);
      ctx.status = 200;
    },
  );

  router.post('/registration', async (ctx) => {
    const { login, password } = ctx.request.body;
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
      login: login,
      password: hash,
    });

    ctx.body = newUser;
    ctx.status = 201;
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
      };

      const accessToken = jwt.sign(payload, config.secret, {
        expiresIn: '30m',
      });
      const refreshToken = jwt.sign(payload, config.secretRefresh, {
        expiresIn: '30d',
      });
      const userWithToken = await Tokens.findAll({
        where: {
          userId: payload.id,
        },
      });
      if (userWithToken.length > 0) {
        const updatedToken = await Tokens.update(
          { refreshToken: refreshToken },
          {
            where: {
              id: payload.id,
            },
          },
        );
      } else {
        const createdToken = await Tokens.create({
          userId: payload.id,
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
      const id = ctx.request.body.id;
      const logoutInfo = await Tokens.destroy({
        where: {
          userId: id,
        },
      });

      ctx.body = logoutInfo;
      ctx.status = 200;
    },
  );

  router.post('/refresh', async (ctx) => {
    const refreshToken = ctx.request.body.refreshToken;
    if (refreshToken) {
      try {
        const verified = jwt.verify(refreshToken, config.secretRefresh);
        const usersToken = await Tokens.findAll({
          where: {
            refreshToken: refreshToken,
          },
        });
        console.log('Got refresh -> ', refreshToken);
        console.log('Is refresh token verified -> ', verified);
        console.log('User with this token -> ', usersToken[0]);
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
                refreshToken: refreshToken,
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
