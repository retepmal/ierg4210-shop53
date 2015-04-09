var anyDB   = require('any-db'),
    config  = require('./shop53.config.js'),
    csrf    = require('csurf'),
    express = require('express'),
    exphbs  = require('express-handlebars'),
    session = require('express-session'),

    frontEndRouter    = require(__dirname + '/routes/frontend.js'),
    frontEndAPIRouter = require(__dirname + '/routes/frontend.api.js'),
    cartRouter        = require(__dirname + '/routes/cart.js'),
    accountRouter     = require(__dirname + '/routes/account.js'),
    accountAPIRouter  = require(__dirname + '/routes/account.api.js'),
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

// session middleware
app.use(session({
    name: 'auth',
    cookie: {
        path: '/',
        httpOnly: true,
        maxAge: 3 * 24 * 60 * 60 * 1000, // in milliseconds
    },
    secret: process.env.SESSION_SECRET,
    rolling: false,
    resave: false,
    saveUninitialized: false,
}));

// csrf middleware, using express-session
app.use(csrf({ cookie: false }));
app.use(function(err, req, res, next) {
    if(err.code !== 'EBADCSRFTOKEN') return next(err)

    // handle CSRF token errors
    res.status(403).send('Invalid CSRF token').end();
});

// serve static files
app.use('/images', express.static(__dirname + '/public/images'));
app.use('/lib', express.static(__dirname + '/public/javascripts'));
app.use('/css', express.static(__dirname + '/public/stylesheets'));
app.use('/fonts', express.static(__dirname + '/public/fonts'));

/*
 * middleware to enforce full site in HTTPS
 */
app.use('/', function(req, res) {
    var schema = req.headers['x-forwarded-proto'];

    if( process.env.NODE_ENV == 'production' && schema != 'https' ) {
        res.redirect(303, 'https://' + req.headers.host + '/' + req.url);
    } else {
        req.next();
    }
});

// include frontend and backend routers
app.use('/', frontEndRouter(pool));
app.use('/api', frontEndAPIRouter(pool));
app.use('/cart', cartRouter(pool));
app.use('/account', accountRouter(pool)); // highest priority in /account
app.use('/account/api', accountAPIRouter(pool));
app.use('/admin', authRouter(pool)); // highest priority in /admin
app.use('/admin', backEndRouter(pool));
app.use('/admin/api', backEndAPIRouter(pool));

// start listening on port 3000
app.listen(process.env.PORT || 3000, function () {
    console.log('listening on: ' + (process.env.PORT || 3000));
});
