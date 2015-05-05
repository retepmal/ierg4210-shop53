var express = require('express');

module.exports = function(pool, config) {
    var app = express.Router();

    // expected: /admin
    app.get('/', function(req, res) {
        res.redirect(307, '/admin/categories');
    });

    // expected: /admin/categories
    app.get('/categories', function(req, res) {
        var cspRules = "default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self'; font-src 'self'; connect-src 'self'";
        res.set('Content-Security-Policy', cspRules);
        res.set('X-Content-Security-Policy', cspRules);
        res.set('X-WebKit-CSP', cspRules);

        res.render('admin-categories', {
            layout: 'admin',
            adminSection: 'categories',
            uiScripts: ['ui.admin.category.js'],
            _csrf: req.csrfToken()
        });
    });

    // expected: /admin/products
    app.get('/products', function(req, res) {
        var cspRules = "default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self'; font-src 'self'; img-src " + config.s3ImagesDomain + "; connect-src 'self'";
        res.set('Content-Security-Policy', cspRules);
        res.set('X-Content-Security-Policy', cspRules);
        res.set('X-WebKit-CSP', cspRules);

        res.render('admin-products', {
            layout: 'admin',
            adminSection: 'products',
            uiScripts: [
                'URI.js',
                'ui.admin.product.js',
            ],
            _csrf: req.csrfToken()
        });
    });

    // expected: /admin/newpassword
    app.get('/newpassword', function(req, res) {
        var cspRules = "default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self'; font-src 'self'; connect-src 'self'";
        res.set('Content-Security-Policy', cspRules);
        res.set('X-Content-Security-Policy', cspRules);
        res.set('X-WebKit-CSP', cspRules);

        res.render('admin-newpassword', {
            layout: 'admin',
            adminSection: 'newpassword',
            uiScripts: ['ui.admin.newpassword.js'],
            _csrf: req.csrfToken()
        });
    });

    return app;
};
