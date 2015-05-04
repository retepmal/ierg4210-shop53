var express = require('express');

module.exports = function(pool, config) {
    var app = express.Router();

    // render all frontend pages using index.handlebars,
    // category and product data will be loaded via AJAX request
    function renderFontEnd(req, res) {
        var cspRules = "default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self'; font-src 'self'; img-src " + config.s3ImagesDomain + "; connect-src 'self'";
        res.set('Content-Security-Policy', cspRules);
        res.set('X-Content-Security-Policy', cspRules);
        res.set('X-WebKit-CSP', cspRules);

        res.render('index', {_csrf: req.csrfToken()});
    }

    // serve multiple pages
    app.get('/', renderFontEnd);
    app.get('/:catid([0-9]+)', renderFontEnd);
    app.get('/:catid([0-9]+)/:pid([0-9]+)', renderFontEnd);
    app.get('/:catid([0-9]+)/page/:page([0-9]+)', renderFontEnd);

    return app;
};
