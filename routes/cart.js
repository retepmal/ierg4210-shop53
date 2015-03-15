var express = require('express'),
    expressValidator = require('express-validator'),
    bodyParser = require('body-parser');

module.exports = function(pool) {
    var app = express.Router();

    app.use(bodyParser.json());

    // expected: /cart/products
    app.post('/products', function(req, res) {
        var productIds = [];
        var whereClause = '';

        // verify request body is a JSON array containing integers
        if( Array.isArray(req.body) ) {
            for( var i = 0; i < req.body.length; i++ ) {
                var pid = parseInt(req.body[i]);

                if( pid > 0 ) {
                    productIds.push(pid);
                } else {
                    // invalid request
                    return res.status(400).end();
                }
            }

            whereClause = productIds.join(',');

        } else {
            // invalid request
            return res.status(400).end();
        }

        // request products in database
        pool.query('SELECT pid, catid, name, price FROM products WHERE pid in (' + whereClause + ') ORDER BY name ASC',
            function(error, result) {
            if( error ) {
                return res.status(500).end();
            }

            res.json(result.rows);
        });
    });

    return app;
};
