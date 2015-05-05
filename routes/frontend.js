var express = require('express');

module.exports = function(pool) {
    var app = express.Router();

    // render all frontend pages using index.handlebars,
    // category and product data will be loaded via AJAX request
    function renderFontEnd(req, res) {
        res.render('index', {_csrf: req.csrfToken()});
    }

    // serve multiple pages
    app.get('/', renderFontEnd);
    app.get(/^\/[0-9]+\-[\w\-]+$/, renderFontEnd);                  // i.e. /[catid]-[slug]
    app.get(/^\/[0-9]+\-[\w\-]+\/[0-9]+\-[\w\-]+$/, renderFontEnd); // i.e. /[catid]-[slug]/[pid]-[slug]
    app.get(/^\/[0-9]+\-[\w\-]+\/page\/[0-9]+$/, renderFontEnd);    // i.e. /[catid]-[slug]/page/[page#]

    return app;
};
