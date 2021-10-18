import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import Koa from 'koa';
import { Server } from 'socket.io';
import config from './src/lib/config.js';
import routeInit from './src/router/index.js';
import handler from './src/handlers/index.js';

const app = async () => {
  const app = new Koa();
  const httpServer = http.createServer(app.callback());
  const io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:4200'],
    },
  });

  io.on('connection', async (socket) => {
    console.log('User socket id is ', socket.id);
    socket.on('join-room', (userId) => {
      socket.join(userId);
    });

    app.use(handler.cors());
    app.use(handler.bodyParser());
    app.use(handler.errors);
    app.use(handler.passportInIt);

    const router = await routeInit(socket);
    app.use(router.routes());
    app.use(router.allowedMethods());
  });

  // app.listen(config.port, () =>
  //   console.log(`Server is runing on port ${config.port}`),
  // );
  httpServer.listen(config.port);
};

export default app();
