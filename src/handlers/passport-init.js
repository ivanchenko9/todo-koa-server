import passport from 'koa-passport';
import passportConfig from '../lib/passport-config.js';

passportConfig(passport);

export default passport.initialize();
