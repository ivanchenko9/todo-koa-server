import Koa from 'koa';
import routeInit from './src/router/index.js';
import handler from './src/handlers/index.js';

const app = async () => {
  const app = new Koa();

  app.use(handler.cors());
  app.use(handler.bodyParser());
  app.use(handler.errors);

  const router = await routeInit();
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.listen(3000, () => console.log('Server is runing on port 3000'));
};

export default app();
