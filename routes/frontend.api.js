var express = require('express'),
    expressValidator = require('express-validator'),
    bodyParser = require('body-parser');

module.exports = function(pool) {
    var app = express.Router();

    app.use(bodyParser.urlencoded({extended:true}));
    // this line must be immediately after express.bodyParser()!
    app.use(expressValidator({
        errorFormatter: function(param, msg, value) {
            var namespace = param.split('.')
              , root      = namespace.shift()
              , formParam = root;

            while(namespace.length) {
                formParam += '[' + namespace.shift() + ']';
            }
            return msg;
        }
    }));

    // expected: /api/categories
    app.get('/categories', function(req, res) {
        pool.query('SELECT * FROM categories ORDER BY name ASC', function(error, result) {
            if( error ) {
                return res.status(500).send('Database Error').end();
            }
            res.json(result.rows);
        });
    });

    // expected: /api/category/(catid)/(page)
    app.get('/category/:id([0-9]+)/:page([0-9]+)', function(req, res) {
        // run input validations
        req.checkParams('id', 'Invalid Category ID')
            .notEmpty()
            .isInt();

        req.checkParams('page', 'Invalid Page Number')
            .notEmpty()
            .isInt();

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.status(400).send(errors).end();
        }

        // no where clause if selecting products in all categories
        var whereClause = 'WHERE catid = ?';
        if( req.params.id == 0 ) {
            whereClause = '';
        }

        pool.query('SELECT COUNT(pid) AS count FROM products ' + whereClause,
            [req.params.id],
            function(error, result) {
                if( error ) {
                    return res.status(500).send('Database Error').end();
                }

                var productCount = result.rows[0].count;
                var pageSize = 10;

                pool.query('SELECT pid, catid, name, price, CONCAT(pid, ".", image_extension) AS image FROM products ' + whereClause + ' ORDER BY name ASC LIMIT ?,?',
                    (( req.params.id == 0 ) ?
                        [(req.params.page - 1) * pageSize, pageSize] :
                        [req.params.id, (req.params.page - 1) * pageSize, pageSize]
                    ),
                    function(error, result) {
                        if( error ) {
                            return res.status(500).send('Database Error').end();
                        }
                        res.json({
                            data: result.rows,
                            pages: Math.ceil(productCount / pageSize),
                        });
                    }
                );
            }
        );
    });

    // expected: /api/product/(pid)
    app.get('/product/:id([0-9]+)', function (req, res) {
        // run input validations
        req.checkParams('id', 'Invalid Product ID')
            .notEmpty()
            .isInt();

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.status(400).send(errors).end();
        }

        pool.query('SELECT pid, catid, name, price, description, CONCAT(pid, ".", image_extension) AS image FROM products WHERE pid = ? LIMIT 1',
            [req.params.id],
            function(error, result) {
                if( error ) {
                    return res.status(500).send('Database Error').end();
                }
                if( result.rowCount == 0 ) {
                    return res.status(400).send('Invalid Product ID').end();

                } else {
                    res.json(result.rows[0]);
                }
            }
        );
    });

    return app;
};
