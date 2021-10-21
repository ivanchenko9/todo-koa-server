import Router from 'koa-router';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'koa-passport';
import config from '../lib/config.js';
import db from '../lib/db/index.js';
import pkg from 'sequelize';
const router = new Router();
const Users = db.users;
const Tokens = db.tokens;
const { Op } = pkg;

function validationUsersData(email, login, password) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!re.test(String(email).toLowerCase())) {
    console.log('Email is incorrect!');
    return false;
  }
  if (login.length < 4 || login.length > 15) {
    console.log('Login is incorrect!');
    return false;
  }
  if (password.length < 4 || password.length > 20) {
    console.log('Password is incorrect!');
    return false;
  }
  return true;
}

router.post('/registration', async (ctx) => {
  const { email, login, password } = ctx.request.body;
  if (validationUsersData(email, login, password)) {
    const user = await Users.findAll({
      where: {
        login: login,
      },
    });
    if (user.length > 0) {
      ctx.throw(400, 'User with such login is already exist!');
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = await Users.create({
      email: email,
      login: login,
      password: hash,
      createdAt: Date.now(),
    });

    const responseBody = {
      isActive: newUser.dataValues.isActive,
      role: newUser.dataValues.role,
      email: newUser.dataValues.email,
      login: newUser.dataValues.login,
    };

    ctx.body = responseBody;
    ctx.status = 201;
  } else {
    ctx.body = { message: 'Users data is incorrect!' };
    ctx.status = 400;
  }
});

router.post('/delete', async (ctx) => {
  const { login } = ctx.request.body;

  const user = await Users.findAll({
    where: {
      login: login,
    },
  });

  if (user.length === 0) {
    ctx.throw(400, 'User with such login does not exist!');
  }

  const deletedUser = await Users.destroy({
    where: {
      login: login,
    },
  });

  ctx.body = { message: 'User succesfull deleted!' };
  ctx.status = 200;
});

router.post('/login', async (ctx) => {
  const { login, password } = ctx.request.body;
  const user = await Users.findAll({
    where: {
      login: login,
    },
  });
  if (user.length === 0) {
    ctx.throw(400, 'User with such login does not exist!');
  }

  const isMatch = await bcrypt.compare(password, user[0].password);
  if (isMatch) {
    const payload = {
      id: user[0].id,
      login: user[0].login,
      email: user[0].email,
    };

    const accessToken = jwt.sign(payload, config.secret, {
      expiresIn: '30m',
    });
    const refreshToken = jwt.sign(payload, config.secretRefresh, {
      expiresIn: '30d',
    });
    const userWithToken = await Tokens.findAll({
      where: {
        [Op.and]: [{ userId: payload.id }, { socketId: ctx.socketId }],
      },
    });
    if (userWithToken.length > 0) {
      const updatedToken = await Tokens.update(
        { refreshToken: refreshToken },
        {
          where: {
            [Op.and]: [{ userId: payload.id }, { socketId: ctx.socketId }],
          },
        },
      );
    } else {
      const createdToken = await Tokens.create({
        userId: payload.id,
        socketId: ctx.socketId,
        refreshToken: refreshToken,
      });
    }
    ctx.body = {
      token: `Bearer ${accessToken}`,
      refreshToken,
    };
    ctx.status = 200;
  } else {
    ctx.throw(400, 'Password is incorrect');
  }
});

router.post(
  '/logout',
  passport.authenticate('jwt', { session: false }),
  async (ctx) => {
    const { user } = ctx.state;
    const id = ctx.request.body.id;
    const logoutInfo = await Tokens.destroy({
      where: {
        [Op.and]: [{ userId: id }, { socketId: ctx.socketId }],
      },
    });
    ctx.body = logoutInfo;
    ctx.status = 200;
    ctx.socketLeave(user.id);
  },
);

router.post('/refresh', async (ctx) => {
  const refreshToken = ctx.request.body.refreshToken;
  if (refreshToken) {
    try {
      const verified = jwt.verify(refreshToken, config.secretRefresh);
      const usersToken = await Tokens.findAll({
        where: {
          [Op.and]: [
            { refreshToken: refreshToken },
            { socketId: ctx.socketId },
          ],
        },
      });
      if (verified && usersToken.length > 0) {
        const decodeToken = jwt.decode(refreshToken);
        const searchedUser = await Users.findAll({
          where: {
            login: decodeToken.login,
          },
        });

        const payload = {
          id: searchedUser[0].id,
          login: searchedUser[0].login,
          email: searchedUser[0].email,
        };

        const accessToken = jwt.sign(payload, config.secret, {
          expiresIn: '30m',
        });
        const newRefreshToken = jwt.sign(payload, config.secretRefresh, {
          expiresIn: '30d',
        });

        const updatedToken = await Tokens.update(
          { refreshToken: newRefreshToken },
          {
            where: {
              [Op.and]: [
                { refreshToken: refreshToken },
                { socketId: ctx.socketId },
              ],
            },
          },
        );

        ctx.body = {
          token: `Bearer ${accessToken}`,
          refreshToken: newRefreshToken,
        };
        ctx.status = 201;
      } else {
        ctx.throw(401, 'Unauthorized');
      }
    } catch (error) {
      console.error(error);
      ctx.throw(400, 'Cannot refresh');
    }
  } else {
    ctx.throw(400, 'Refresh token is incorrect');
  }
});

export default router.routes();
