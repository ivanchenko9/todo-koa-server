import Router from 'koa-router';
import getCollections from '../lib/mongodb.js';

const router = new Router();

function getDataFromDb(dbTodoList) {
  const newPromise = new Promise((resolve, reject) => {
    dbTodoList.find().toArray((err, items) => {
      const newDataList = items;
      resolve(newDataList);
    });
  });

  const serverResponse = newPromise.then((responseData) => responseData);
  return serverResponse;
}

async function sendDataToClient(dbTodoList) {
  const rawData = await getDataFromDb(dbTodoList);
  const stringifyResponse = JSON.stringify(rawData);
  return stringifyResponse;
}

const completeAllTasks = async (requestedStatus, dbTodoList) => {
  let updateManyInfo;
  if (requestedStatus === true) {
    updateManyInfo = await dbTodoList.updateMany(
      {},
      { $set: { isCompleted: true } },
    );
    return;
  } else if (requestedStatus === false) {
    updateManyInfo = await dbTodoList.updateMany(
      {},
      { $set: { isCompleted: false } },
    );
    return updateManyInfo;
  }
};

const routeInit = async () => {
  const collections = await getCollections();
  const dbTodoList = collections.dbTodoList;

  router.get('/todos', async (ctx) => {
    ctx.body = await sendDataToClient(dbTodoList);
    ctx.status = 200;
  });

  router.post('/todos', async (ctx) => {
    const { id, title, isCompleted } = ctx.request.body;
    const insertInfo = await dbTodoList.insertOne({
      id: id,
      title: title,
      isCompleted: isCompleted,
    });
    ctx.body = await sendDataToClient(dbTodoList);
    ctx.status = 201;
  });

  router.patch('/todos/update', async (ctx) => {
    const { id, isCompleted } = ctx.request.body;
    const updateInfo = await dbTodoList.findOneAndUpdate(
      { id: id },
      { $set: { isCompleted: isCompleted } },
    );
    ctx.body = await sendDataToClient(dbTodoList);
    ctx.status = 200;
  });

  router.delete('/todos/delete', async (ctx) => {
    const deleteInfo = await dbTodoList.deleteOne({
      id: Number(ctx.request.query.id),
    });
    ctx.body = await sendDataToClient(dbTodoList);
    ctx.status = 200;
  });

  router.delete('/todos/cleardone', async (ctx) => {
    const deleteManyInfo = await dbTodoList.deleteMany({ isCompleted: true });
    ctx.body = await sendDataToClient(dbTodoList);
    ctx.status = 200;
  });

  router.patch('/todos/completeall', async (ctx) => {
    const { isCompletedAll } = ctx.request.body;
    const completeAllInfo = await completeAllTasks(isCompletedAll, dbTodoList);
    ctx.body = await sendDataToClient(dbTodoList);
    ctx.status = 200;
  });

  return router;
};

export default routeInit;
