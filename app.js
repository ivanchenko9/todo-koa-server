const Koa = require('koa')
const { MongoClient } = require('mongodb')
const app = new Koa()

const initRouter = require('./router')
const { errors, bodyParser, cors } = require('./handlers')

const client = new MongoClient('mongodb://127.0.0.1:27017/todos')
let db

client.connect(function (err, client) {
  db = client.db()

  dbTodoList = db.collection('todosList')
  dbUsersList = db.collection('usersList')

  app.use(cors())
  app.use(bodyParser())
  app.use(errors)
  const router = initRouter(dbTodoList)
  app.use(router.routes())
  app.use(router.allowedMethods())

  app.listen(3000, () => console.log('Server is runing on port 3000'))
})
