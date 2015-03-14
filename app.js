var anyDB   = require('any-db'),
    config  = require('./shop53.config.js'),
    express = require('express'),
    exphbs  = require('express-handlebars'),

    frontEndRouter    = require(__dirname + '/routes/frontend.js'),
    frontEndAPIRouter = require(__dirname + '/routes/frontend.api.js'),
    cartRouter        = require(__dirname + '/routes/cart.js'),
    authRouter        = require(__dirname + '/routes/auth.api.js'),
    backEndRouter     = require(__dirname + '/routes/backend.js'),
    backEndAPIRouter  = require(__dirname + '/routes/backend.api.js');

var app = express();
var pool = anyDB.createPool(config.dbURI, {
    min: 2, max: 20
});

// set express-handlebars
app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    helpers: {
        equal: require("handlebars-helper-equal"),
    },
}));
app.set('view engine', 'handlebars');

// serve static files
app.use('/images', express.static(__dirname + '/public/images'));
app.use('/lib', express.static(__dirname + '/public/javascripts'));
app.use('/css', express.static(__dirname + '/public/stylesheets'));
app.use('/fonts', express.static(__dirname + '/public/fonts'));

// include frontend and backend routers
app.use('/', frontEndRouter(pool));
app.use('/api', frontEndAPIRouter(pool));
app.use('/cart', cartRouter(pool));
app.use('/admin', authRouter(pool)); // highest priority in /admin
app.use('/admin', backEndRouter(pool));
app.use('/admin/api', backEndAPIRouter(pool));

// start listening on port 3000
app.listen(process.env.PORT || 3000, function () {
    console.log('listening on: ' + (process.env.PORT || 3000));
});
