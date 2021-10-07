import Router from 'koa-router';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'koa-passport';
import config from '../lib/config.js';
import getCollections from '../lib/mongodb.js';
import { ObjectId } from 'mongodb';

const router = new Router();

function getDataFromDb(dbTodoList, userId) {
  const newPromise = new Promise((resolve, reject) => {
    dbTodoList
      .find({
        user: userId,
      })
      .toArray((err, items) => {
        const newDataList = items;
        resolve(newDataList);
      });
  });

  const serverResponse = newPromise.then((responseData) => responseData);
  return serverResponse;
}

async function getUserFomDBbyId(dbUsersList, userId) {
  const newPromise = new Promise((resolve, reject) => {
    dbUsersList.find({ id: ObjectId(userId) }).toArray((err, items) => {
      const searchedUser = items;
      resolve(searchedUser);
    });
  });

  const serverResponse = newPromise.then((responseData) => responseData);
  return serverResponse;
}

async function findToken(dbTokenList, refreshToken) {
  const newPromise = new Promise((resolve, reject) => {
    dbTokenList.find({ refreshToken }).toArray((err, items) => {
      const searchedUser = items;
      resolve(searchedUser);
    });
  });

  const serverResponse = newPromise.then((responseData) => responseData);
  return serverResponse;
}

function getUserFomDbByLogin(dbUsersList, login) {
  const newPromise = new Promise((resolve, reject) => {
    dbUsersList.find({ login: login }).toArray((err, items) => {
      const searchedUser = items;
      resolve(searchedUser);
    });
  });

  const serverResponse = newPromise.then((responseData) => responseData);
  return serverResponse;
}

async function sendDataToClient(dbTodoList, userId) {
  const rawData = await getDataFromDb(dbTodoList, userId);
  const stringifyResponse = JSON.stringify(rawData);
  return stringifyResponse;
}

const completeAllTasks = async (requestedStatus, dbTodoList, userId) => {
  let updateManyInfo;
  if (requestedStatus === true) {
    updateManyInfo = await dbTodoList.updateMany(
      { user: userId },
      { $set: { isCompleted: true } },
    );
    return;
  } else if (requestedStatus === false) {
    updateManyInfo = await dbTodoList.updateMany(
      { user: userId },
      { $set: { isCompleted: false } },
    );
    return updateManyInfo;
  }
};

const routeInit = async () => {
  const collections = await getCollections();
  const dbTodoList = collections.dbTodoList;
  const dbUsersList = collections.dbUsersList;
  const dbTokenList = collections.dbTokenList;

  router.get(
    '/todos',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { user } = ctx.state;
      ctx.body = await sendDataToClient(dbTodoList, user._id);
      ctx.status = 200;
    },
  );

  router.post(
    '/todos',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { id, title, isCompleted } = ctx.request.body;
      const { user } = ctx.state;
      const insertInfo = await dbTodoList.insertOne({
        id: id,
        title: title,
        isCompleted: isCompleted,
        user: user._id,
      });
      ctx.body = await sendDataToClient(dbTodoList, user._id);
      ctx.status = 201;
    },
  );

  router.patch(
    '/todos/update',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { id, isCompleted } = ctx.request.body;
      const { user } = ctx.state;
      const updateInfo = await dbTodoList.findOneAndUpdate(
        { id: id, user: user._id },
        { $set: { isCompleted: isCompleted } },
      );
      ctx.body = await sendDataToClient(dbTodoList, user._id);
      ctx.status = 200;
    },
  );

  router.delete(
    '/todos/delete',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { user } = ctx.state;
      const deleteInfo = await dbTodoList.deleteOne({
        id: Number(ctx.request.query.id),
        user: user._id,
      });
      ctx.body = await sendDataToClient(dbTodoList, user._id);
      ctx.status = 200;
    },
  );

  router.delete(
    '/todos/cleardone',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { user } = ctx.state;
      const deleteManyInfo = await dbTodoList.deleteMany({
        isCompleted: true,
        user: user._id,
      });
      ctx.body = await sendDataToClient(dbTodoList, user._id);
      ctx.status = 200;
    },
  );

  router.patch(
    '/todos/completeall',
    passport.authenticate('jwt', { session: false }),
    async (ctx) => {
      const { isCompletedAll } = ctx.request.body;
      const { user } = ctx.state;
      const completeAllInfo = await completeAllTasks(
        isCompletedAll,
        dbTodoList,
        user._id,
      );
      ctx.body = await sendDataToClient(dbTodoList, user._id);
      ctx.status = 200;
    },
  );

  router.post('/registration', async (ctx) => {
    const { login, password } = ctx.request.body;
    const user = await getUserFomDbByLogin(dbUsersList, login);
    if (user.length > 0) {
      ctx.throw(400, 'User with such login is already exist!');
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const isertUserInfo = await dbUsersList.insertOne({
      login: login,
      password: hash,
    });

    ctx.body = await sendDataToClient(dbUsersList, user._id);
    ctx.status = 201;
  });

  router.post('/login', async (ctx) => {
    const { login, password } = ctx.request.body;
    const user = await getUserFomDbByLogin(dbUsersList, login);

    if (user.length === 0) {
      ctx.throw(400, 'User with such does not exist!');
    }

    const isMatch = await bcrypt.compare(password, user[0].password);
    if (isMatch) {
      const payload = {
        _id: user[0]._id,
        login: user[0].login,
      };

      const accessToken = jwt.sign(payload, config.secret, {
        expiresIn: '30m',
      });
      const refreshToken = jwt.sign(payload, config.secretRefresh, {
        expiresIn: '30d',
      });
      const userWithToken = await getUserFomDBbyId(dbTokenList, payload._id);
      console.log(userWithToken);
      if (userWithToken.length > 0) {
        console.log('has string');
        const updateInfo = await dbTokenList.findOneAndUpdate(
          { id: payload._id },
          { $set: { refreshToken: refreshToken } },
        );
      } else {
        console.log('has not had string yet');
        const insertToken = await dbTokenList.insertOne({
          id: payload._id,
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
      const logoutInfo = await dbTokenList.deleteOne({
        id: ObjectId(id),
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
        console.log(refreshToken);
        const usersToken = await findToken(dbTokenList, refreshToken);
        if (verified && usersToken.length > 0) {
          const decodeToken = jwt.decode(refreshToken);
          const user = await getUserFomDbByLogin(
            dbUsersList,
            decodeToken.login,
          );

          const payload = {
            _id: user[0]._id,
            login: user[0].login,
          };

          const accessToken = jwt.sign(payload, config.secret, {
            expiresIn: '30m',
          });
          const newRefreshToken = jwt.sign(payload, config.secretRefresh, {
            expiresIn: '30d',
          });

          const updateInfo = await dbTokenList.findOneAndUpdate(
            { refreshToken },
            { $set: { refreshToken: newRefreshToken } },
          );

          ctx.body = {
            token: `Bearer ${accessToken}`,
            refreshToken: `Bearer ${newRefreshToken}`,
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
