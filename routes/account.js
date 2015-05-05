var express = require('express'),
    expressValidator = require('express-validator'),
    bodyParser = require('body-parser'),
    crypto = require('crypto'),
    uuid = require('uuid'),
    nodemailer = require('nodemailer');

module.exports = function(pool, config) {
    var app  = express.Router();

    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: config.gmailUser,
            pass: config.gmailPass
        }
    });

    app.use(bodyParser.urlencoded({extended:true}));
    // this line must be immediately after express.bodyParser()!
    app.use(expressValidator({
        errorFormatter: function(param, msg, value) {
            var namespace = param.split('.')
              , root      = namespace.shift()
              , formParam = root;

            while(namespace.length) {
                formParam += '[' + namespace.shift() + ']';
            }
            return msg;
        }
    }));

    var signinPage = function(req, res) {
        var cspRules = "default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self'; font-src 'self'; connect-src 'self'";
        res.set('Content-Security-Policy', cspRules);
        res.set('X-Content-Security-Policy', cspRules);
        res.set('X-WebKit-CSP', cspRules);

        res.render('account-login', {
            layout: 'account',
            userSection: 'login',
            uiScripts: [
                'URI.js',
                'ui.account.login.js'
            ],
            _csrf: req.csrfToken()
        });
    };

    // expected: /account/login
    app.get('/login', signinPage);

    // expected: /account/login/(action)
    app.get('/login/:action(\\w+)', signinPage);

    // expected: /account/api/login
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
                        if( result.rows[0].activation_key === null ) {
                            // success
                            req.session.regenerate(function() {
                                // set authenticated information
                                req.session.authenticated = true;
                                req.session.uid = result.rows[0].uid;
                                req.session.is_admin = ( result.rows[0].is_admin == 1 );

                                return res.status(200).end();
                            });
                        } else {
                            // wrong credential
                            req.session.regenerate(function() {
                                // send new csrf token via response header
                                res.set('Access-Control-Expose-Headers', 'X-CSRF-Refresh');
                                res.set('X-CSRF-Refresh', req.csrfToken());

                                return res.status(412).end();
                            });
                        }

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

    // expected: /account/create
    app.get('/create', function(req, res) {
        var cspRules = "default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'";
        res.set('Content-Security-Policy', cspRules);
        res.set('X-Content-Security-Policy', cspRules);
        res.set('X-WebKit-CSP', cspRules);

        res.render('account-create', {
            layout: 'account',
            userSection: 'create',
            uiScripts: ['ui.account.create.js'],
            _csrf: req.csrfToken()
        });
    });

    // expected: /account/api/create
    app.post('/api/create', function(req, res) {
        // run input validations
        req.checkBody('email')
            .notEmpty()
            .isEmail();
        req.checkBody('password')
            .notEmpty()
            .len(8);

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.status(400).send(errors).end();
        }

        var email = req.body.email;
        var salt = crypto.randomBytes(32).toString('base64');
        var saltedPassword = crypto.createHmac('sha256', salt);
            saltedPassword.update(req.body.password);
        var activationKey = uuid.v4();

        // insert user record
        pool.query('INSERT INTO users (email, password, salt, activation_key, is_admin) VALUES (?, ?, ?, ?, 0)',
            [email, saltedPassword.digest('base64'), salt, activationKey],
            function(error, result) {
                if( error ) {
                    if( error.errno == 1062 ) {
                        // #1062 - Duplicate entry for key 'email'
                        var errors = 'Email Already Registered';
                    } else {
                        var errors = 'Database Error';
                    }

                    return res.status(400).send(errors).end();
                }

                // send email for account confirmation
                var activationLink = config.baseUri + "/account/activate/" + email + "/" + activationKey;
                var mailOptions = {
                    from: 'Rilakkuma Store (IERG4210 Shop53) <' + config.gmailUser + '>',
                    to: email,
                    subject: 'Account activation for Rilakkuma Store (IERG4210 Shop53)',
                    html: 'Hi,<br /><br />Please visit the following link to activate your account:<br />' +
                          '<a href="' + activationLink + '">' + activationLink + '</a><br /><br />Rilakkuma Store<br />(IERG4210 Shop53)'
                };

                transporter.sendMail(mailOptions, function(error, info){
                    if( error ) {
                        return res.status(400).send("Account created but email confirmation failed to send. Please contact store admin.").end();
                    }

                    return res.status(200).end();
                });
            }
        );
    });

    // expected: /account/activate/(email)/(activation_key)
    app.get('/activate/:email/:activation_key', function(req, res) {
        var invalidLinkRedirect = '/account/login#invalid_activation';
        var successActivateRedirect = '/account/login#account_activated';

        // run input validations
        req.checkParams('email')
            .notEmpty()
            .isEmail();
        req.checkParams('activation_key')
            .notEmpty()
            .isUUID();

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.redirect(307, invalidLinkRedirect);
        }

        pool.query('SELECT uid FROM users WHERE email = ? AND activation_key = ? LIMIT 1',
            [req.params.email, req.params.activation_key],
            function(error, result) {
                if( error || result.rowCount == 0 ) {
                    return res.redirect(307, invalidLinkRedirect);
                }

                pool.query('UPDATE users SET activation_key = NULL WHERE uid = ? LIMIT 1',
                    [result.rows[0].uid],
                    function(error, result) {
                        if( error || result.affectedRows === 0 ) {
                            return res.redirect(307, invalidLinkRedirect);
                        }

                        // redirect user to signin page with successful message
                        return res.redirect(307, successActivateRedirect);
                    }
                );
            }
        );
    });

    // expected: /account/logout
    app.get('/logout', function(req, res) {
        if( req.session ) {
            req.session.destroy();
        }
        res.redirect(307, '/account/login');
    });

    /*
     * middleware to validate the token
     */
    app.use('/', function(req, res) {
        if( req.session && req.session.authenticated ) {
            if( !req.session.is_admin ) {
                // logined, non-admin user
                req.next();
            } else {
                // redirect admin user to admin panel
                if( req.xhr ) {
                    return res.status(409).send('Conflict').end();
                } else {
                    res.redirect(307, '/admin');
                }
            }
        } else {
            if( req.xhr ) {
                return res.status(401).send('Not Authenticated').end();
            } else {
                res.redirect(307, '/account/login');
            }
        }
    });

    // expected: /account
    app.get('/', function(req, res) {
        var cspRules = "default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'";
        res.set('Content-Security-Policy', cspRules);
        res.set('X-Content-Security-Policy', cspRules);
        res.set('X-WebKit-CSP', cspRules);

        res.render('account-orders', {
            layout: 'account',
            userSection: 'orders',
            uiScripts: ['ui.account.order.js'],
            _csrf: req.csrfToken()
        });
    });

    // expected: /account/newpassword
    app.get('/newpassword', function(req, res) {
        var cspRules = "default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'";
        res.set('Content-Security-Policy', cspRules);
        res.set('X-Content-Security-Policy', cspRules);
        res.set('X-WebKit-CSP', cspRules);

        res.render('account-newpassword', {
            layout: 'account',
            userSection: 'newpassword',
            uiScripts: ['ui.newpassword.js'],
            _csrf: req.csrfToken()
        });
    });

    return app;
};
