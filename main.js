import dotenv from 'dotenv';
dotenv.config();
import config from './src/lib/config.js';
import httpServer from './app.js';

const main = async () => {
  httpServer.listen(config.port);
};

export default main();
