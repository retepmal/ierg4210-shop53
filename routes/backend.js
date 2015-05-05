var express = require('express');

module.exports = function(pool) {
    var app = express.Router();

    // expected: /admin
    app.get('/', function(req, res) {
        res.redirect(307, '/admin/categories');
    });

    // expected: /admin/categories
    app.get('/categories', function(req, res) {
        res.render('admin-categories', {
            layout: 'admin',
            adminSection: 'categories',
            uiScripts: ['ui.admin.category.js'],
            _csrf: req.csrfToken()
        });
    });

    // expected: /admin/products
    app.get('/products', function(req, res) {
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
        res.render('admin-newpassword', {
            layout: 'admin',
            adminSection: 'newpassword',
            uiScripts: ['ui.admin.newpassword.js'],
            _csrf: req.csrfToken()
        });
    });

    return app;
};
