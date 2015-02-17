var express = require('express');

var app = express.Router();

// expected: /admin
app.get('/', function (req, res) {
    res.redirect(301, '/admin/categories');
});

// expected: /admin/categories
app.get('/categories', function (req, res) {
    res.render('admin-categories', {
        layout: 'admin',
        adminSection: 'categories',
        uiScripts: ['ui.admin.category.js'],
    });
});

// expected: /admin/products
app.get('/products', function (req, res) {
    res.render('admin-products', {
        layout: 'admin',
        adminSection: 'products',
        uiScripts: [
            'URI.js',
            'ui.admin.product.js',
        ],
    });
});

module.exports = app;