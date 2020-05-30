const express = require('express')
const helpers = require('./_helpers')
const handlebars = require('express-handlebars')
const userController = require('./controllers/userController')
const app = express()
const port = 3000

// use helpers.getUser(req) to replace req.user
// use helpers.ensureAuthenticated(req) to replace req.isAuthenticated()

app.engine('handlebars', handlebars({
  defaultLayout: 'main'
  // helpers: require('./config/handlebars-helpers')
}))

app.set('view engine', 'handlebars')

require('./routes')(app)

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

module.exports = app
