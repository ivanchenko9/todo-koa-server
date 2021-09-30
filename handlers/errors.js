module.exports = async (ctx, next) => {
  try {
    await next()
  } catch (error) {
    console.log(error)
    ctx.status = error.status || 500
    ctx.body = { error: error.message || 'Internal Server Error' }
  }
}
