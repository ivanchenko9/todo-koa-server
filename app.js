import http from 'http';
import Koa from 'koa';
import { Server } from 'socket.io';
import router from './src/router/index.js';
import handler from './src/handlers/index.js';

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
    await next();
  });

  app.use(router.routes());
  app.use(router.allowedMethods());
});

export default httpServer;
