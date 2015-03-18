var express = require('express'),
    expressValidator = require('express-validator'),
    bodyParser = require('body-parser'),
    crypto = require('crypto');

module.exports = function(pool) {
    var app  = express.Router();

    app.use(bodyParser.urlencoded({extended:true}));
    // this line must be immediately after express.bodyParser()!
    app.use(expressValidator());

    /*
     * middleware to enforce the admin panel in HTTPS
     */
    app.use('/', function(req, res) {
        var schema = req.headers['x-forwarded-proto'];

        if( process.env.NODE_ENV == 'production' && schema != 'https' ) {
            res.redirect(303, 'https://' + req.headers.host + '/admin' + req.url);
        } else {
            req.next();
        }
    });

    // expected: /admin/login
    app.get('/login', function(req, res) {
        var cspRules = "default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self'; font-src 'self'; connect-src 'self'";
        res.set('Content-Security-Policy', cspRules);
        res.set('X-Content-Security-Policy', cspRules);
        res.set('X-WebKit-CSP', cspRules);

        res.render('admin-login', {
            layout: 'admin',
            adminSection: 'login',
            uiScripts: ['ui.admin.login.js'],
            _csrf: req.csrfToken()
        });
    });

    // expected: /admin/logout
    app.get('/logout', function(req, res) {
        if( req.session ) {
            req.session.destroy();
        }
        res.redirect(307, '/admin/login');
    });

    // expected: /admin/api/login
    app.post('/api/login', function(req, res) {
        // run input validations
        req.checkBody('email')
            .isEmail();
        req.checkBody('password')
            .notEmpty();

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.status(400).end();
        }

        pool.query('SELECT * FROM users WHERE email = ? LIMIT 1',
            [req.body.email],
            function(error, result) {
                if( error ) {
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
                        req.session.regenerate(function() {
                            // send new csrf token via response header
                            res.set('Access-Control-Expose-Headers', 'X-CSRF-Refresh');
                            res.set('X-CSRF-Refresh', req.csrfToken());

                            return res.status(401).end();
                        });
                    }

                } else {
                    // no user found
                    req.session.regenerate(function() {
                        // send new csrf token via response header
                        res.set('Access-Control-Expose-Headers', 'X-CSRF-Refresh');
                        res.set('X-CSRF-Refresh', req.csrfToken());

                        return res.status(401).end();
                    });
                }
            }
        );
    });

    /*
     * middleware to validate the token
     */
    app.use('/', function(req, res) {
        if( req.session && req.session.authenticated && req.session.is_admin ) {
            req.next();
        } else {
            if( req.xhr ) {
                return res.status(401).send('Not Authenticated').end();
            } else {
                res.redirect(307, '/admin/login');
            }
        }
    });

    return app;
};
