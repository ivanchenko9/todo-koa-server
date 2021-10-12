import { Strategy, ExtractJwt } from 'passport-jwt';
import config from './config.js';
import db from './db/index.js';

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.secret,
};

export default async (passport) => {
  const Users = db.users;
  passport.use(
    new Strategy(opts, async (payload, done) => {
      const user = await Users.findAll({
        where: {
          id: payload.id,
        },
      });
      if (user.length > 0) {
        done(null, user[0]);
      } else {
        done(null, false);
      }
    }),
  );
};
