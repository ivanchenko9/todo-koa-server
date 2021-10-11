import { Strategy, ExtractJwt } from 'passport-jwt';
import getCollections from './mongodb.js';
import config from './config.js';
import { ObjectId } from 'mongodb';

// also add sequelize here ======================================================

async function getUserFomDB(dbUsersList, userId) {
  const newPromise = new Promise((resolve, reject) => {
    dbUsersList.find(ObjectId(userId)).toArray((err, items) => {
      const searchedUser = items;
      resolve(searchedUser);
    });
  });

  const serverResponse = newPromise.then((responseData) => responseData);
  return serverResponse;
}

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.secret,
};

export default async (passport) => {
  const collections = await getCollections();
  const dbUsersList = collections.dbUsersList;

  passport.use(
    new Strategy(opts, async (payload, done) => {
      const user = await getUserFomDB(dbUsersList, payload._id);

      if (user.length > 0) {
        done(null, user[0]);
      } else {
        done(null, false);
      }
    }),
  );
};
