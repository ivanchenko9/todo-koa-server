import Router from 'koa-router';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'koa-passport';
import config from '../lib/config.js';
import getCollections from '../lib/mongodb.js';

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
      console.log(user);
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
      console.log(user);
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

  router.post('/register', async (ctx) => {
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
        // maybe i wiil have to change object field 'id' on '_id' or back
        login: user[0].login,
      };
      const token = jwt.sign(payload, config.secret, { expiresIn: 3600 * 24 });
      ctx.body = { token: `Bearer ${token}` };
    } else {
      ctx.throw(400, 'Password is incorrect');
    }
  });

  return router;
};

export default routeInit;
