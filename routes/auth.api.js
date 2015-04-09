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
     * middleware to validate the token
     */
    app.use('/', function(req, res) {
        if( req.session && req.session.authenticated ) {
            if( req.session.is_admin ) {
                // logined, admin user
                req.next();
            } else {
                // redirect non-admin user to user account page
                if( req.xhr ) {
                    return res.status(409).send('Conflict').end();
                } else {
                    res.redirect(307, '/account');
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

    return app;
};
