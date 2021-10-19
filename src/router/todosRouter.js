import Router from 'koa-router';
import passport from 'koa-passport';
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
const Todos = db.todos;
const { Op } = pkg;

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
        [Op.and]: [{ id: Number(ctx.request.params.id) }, { userId: user.id }],
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

export default router.routes();
