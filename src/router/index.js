import Router from 'koa-router';
import todoRouter from './todosRouter.js';
import userRouter from './userRouter.js';

const rootRouter = new Router();
rootRouter.use(todoRouter);
rootRouter.use(userRouter);

export default rootRouter;
