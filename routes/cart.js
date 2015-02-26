var express = require('express');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');

var anyDB  = require('any-db');
var config = require('../shop53.config.js');

var app = express.Router();
var pool = anyDB.createPool(config.dbURI, {
    min: 2, max: 20
});

app.use(bodyParser.json());

// expected: /cart/products
app.post('/products', function (req, res) {
    var productIds = [];
    var whereClause = '';

    // verify request body is a JSON array containing integers
    if( Array.isArray(req.body) ) {
        for( var i = 0; i < req.body.length; i++ ) {
            var pid = parseInt(req.body[i]);

            if( pid > 0 ) {
                productIds.push(pid);
            } else {
                return res.status(400).json({
                    'message': 'Invalid request',
                }).end();
            }
        }

        whereClause = productIds.join(',');

    } else {
        return res.status(400).json({
            'message': 'Invalid request',
        }).end();
    }

    // request products in database
    pool.query('SELECT pid, catid, name, price FROM products WHERE pid in (' + whereClause + ') ORDER BY name ASC',
        function (error, result) {
        if(error) {
            return res.status(500).json({
                'message': 'Database Error',
            }).end();
        }

        res.json(result.rows);
    });
});

module.exports = app;