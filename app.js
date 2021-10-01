import dotenv from 'dotenv';
dotenv.config();

import Koa from 'koa';
import config from './src/lib/config.js';
import routeInit from './src/router/index.js';
import handler from './src/handlers/index.js';

const app = async () => {
  const app = new Koa();

  app.use(handler.cors());
  app.use(handler.bodyParser());
  app.use(handler.errors);
  app.use(handler.passportInIt);

  const router = await routeInit();
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.listen(config.port, () =>
    console.log(`Server is runing on port ${config.port}`),
  );
};

export default app();
