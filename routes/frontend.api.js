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

    // expected: /api/category/(catid)/(slug)/(page)
    app.get('/category/:id([0-9]+)/:slug([a-z0-9\-]+)/:page([0-9]+)', function(req, res) {
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
        var whereClause = 'WHERE c.catid = ? AND c.slug = ? AND c.catid = p.catid';
        if( req.params.id == 0 ) {
            whereClause = 'WHERE c.catid = p.catid';
        }

        pool.query('SELECT COUNT(pid) AS count FROM products p, categories c ' + whereClause,
            [req.params.id, req.params.slug],
            function(error, result) {
                if( error ) {
                    return res.status(500).send('Database Error').end();
                }

                var productCount = result.rows[0].count;
                var pageSize = 10;

                pool.query('SELECT p.pid, p.catid, p.name, p.slug, p.price, p.s3_image_path AS image, c.slug AS catslug FROM products p, categories c ' + whereClause + ' ORDER BY name ASC LIMIT ?,?',
                    (( req.params.id == 0 ) ?
                        [(req.params.page - 1) * pageSize, pageSize] :
                        [req.params.id, req.params.slug, (req.params.page - 1) * pageSize, pageSize]
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

    // expected: /api/product/(pid)/(slug)
    app.get('/product/:id([0-9]+)/:slug([a-z0-9\-]+)', function (req, res) {
        // run input validations
        req.checkParams('id', 'Invalid Product ID')
            .notEmpty()
            .isInt();

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.status(400).send(errors).end();
        }

        pool.query('SELECT p.pid, p.catid, p.name, p.slug, p.price, p.description, p.s3_image_path AS image, c.slug AS catslug FROM products p, categories c WHERE p.pid = ? AND p.slug = ? AND p.catid = c.catid LIMIT 1',
            [req.params.id, req.params.slug],
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
