var express = require('express');

module.exports = function(pool) {
    var app = express.Router();

    // render all frontend pages using index.handlebars,
    // category and product data will be loaded via AJAX request
    function renderFontEnd(req, res) {
        res.render('index');
    }

    // serve multiple pages
    app.get('/', renderFontEnd);
    app.get('/:catid([0-9]+)', renderFontEnd);
    app.get('/:catid([0-9]+)/:pid([0-9]+)', renderFontEnd);
    app.get('/:catid([0-9]+)/page/:page([0-9]+)', renderFontEnd);

    return app;
};
