var express = require('express');

var app = express.Router();

// serve dynamic pages
app.get('/', function (req, res) {
    res.render('index');
});
app.get('/product/:id', function (req, res) {
    res.render('product' + req.params.id);
});
app.get('/catalog/:name', function (req, res) {
    // show index page now, to be finished later
    res.render('index');
});

module.exports = app;