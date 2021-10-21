import http from 'http';
import { Server } from 'socket.io';
import Koa from 'koa';
import router from './src/router/index.js';
import handler from './src/handlers/index.js';
import config from './src/lib/config.js';

const app = new Koa();
const httpServer = http.createServer(app.callback());
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

if (config.isTesting) {
  app.use(handler.cors());
  app.use(handler.bodyParser());
  app.use(handler.errors);
  app.use(handler.passportInIt);
  app.use(async (ctx, next) => {
    const socketSend = (userId, body) => {
      return;
    };
    const socketLeave = (userId) => {
      return;
    };
    ctx.socketLeave = socketLeave;
    ctx.socketId = 0;
    ctx.socketSend = socketSend;
    await next();
  });
  app.use(router.routes());
  app.use(router.allowedMethods());
} else {
  io.on('connection', async (socket) => {
    console.log('User socket id is ', socket.id);
    socket.on('join-room', (userId) => {
      socket.join(userId);
    });

    app.use(handler.cors());
    app.use(handler.bodyParser());
    app.use(handler.errors);
    app.use(handler.passportInIt);

    app.use(async (ctx, next) => {
      const socketSend = (userId, body) => {
        socket.to(userId).emit('notification', body);
      };
      const socketLeave = (userId) => {
        socket.leave(userId);
      };
      ctx.socketLeave = socketLeave;
      ctx.socketId = socket.id;
      ctx.socketSend = socketSend;
      console.log(ctx.socketId);
      await next();
    });

    app.use(router.routes());
    app.use(router.allowedMethods());
  });
}

export { app };
export default httpServer;
