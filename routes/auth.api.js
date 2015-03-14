var express = require('express');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var session = require('express-session');

var anyDB  = require('any-db');
var config = require('../shop53.config.js');

var app  = express.Router();
var pool = anyDB.createPool(config.dbURI, {
    min: 2, max: 20
});

app.use(bodyParser.urlencoded({extended:true}));
// this line must be immediately after express.bodyParser()!
app.use(expressValidator());
app.use(session({
    name: 'auth',
    cookie: {
        path: '/admin',
        httpOnly: true,
        maxAge: 3 * 24 * 60 * 60 * 1000, // in milliseconds
    },
    secret: process.env.SESSION_SECRET,
    rolling: false,
    resave: false,
    saveUninitialized: false,
}));

// expected: /admin/login
app.get('/login', function (req, res) {
    res.render('admin-login', {
        layout: 'admin',
        adminSection: 'login',
        uiScripts: ['ui.admin.login.js'],
    });
});

// expected: /admin/logout
app.get('/logout', function (req, res) {
    if( req.session ) {
        req.session.destroy();
    }
    res.redirect(307, '/admin/login');
});

// expected: /admin/api/login
app.post('/api/login', function (req, res) {
    // run input validations
    req.checkBody('email')
        .isEmail();
    req.checkBody('password')
        .notEmpty();

    // reject when any validation error occurs
    var errors = req.validationErrors();
    if(errors) {
        return res.status(400).end();
    }

    pool.query('SELECT * FROM users WHERE email = ? LIMIT 1',
        [req.body.email],
        function (error, result) {
            if(error) {
                return res.status(500).end();
            }

            if( result.rowCount > 0 ) {
                var salt = result.rows[0].salt;
                var hmac = crypto.createHmac('sha256', salt);

                hmac.update(req.body.password);
                if( hmac.digest('base64') == result.rows[0].password ) {
                    // success
                    req.session.regenerate(function() {
                        // set authenticated information
                        req.session.authenticated = true;
                        req.session.is_admin = ( result.rows[0].is_admin == 1 );

                        return res.status(200).end();
                    });

                } else {
                    // wrong credential
                    return res.status(401).end();
                }

            } else {
                // no user found
                return res.status(401).end();
            }
        }
    );
});

/*
 * middleware to validate the token
 */
app.use('/', function (req, res) {
    if( req.session && req.session.authenticated && req.session.is_admin ) {
        req.next();
    } else {
        if( req.xhr ) {
            res.status(401).send('Not Authenticated').end();
        } else {
            res.redirect(307, '/admin/login');
        }
    }
});

module.exports = app;