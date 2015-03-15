var express = require('express'),
    expressValidator = require('express-validator'),
    bodyParser = require('body-parser'),
    fs = require('fs'),
    util = require('util'),
    multer = require('multer');

module.exports = function(pool) {
    var app  = express.Router();

    var allowedImageExtension = ['gif', 'GIF', 'jpg', 'JPG', 'png', 'PNG', 'jpeg'],
        allowedImageMimeType = ['image/gif', 'image/png', 'image/jpeg'];

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
    app.use(multer()); // for parsing multipart/form-data

    var inputPattern = {
        name: /^[\w- ']+$/,
        price: /^\d+(\.\d{1,2})?$/,
        description: /^[\w- ',\r\n]+$/,
    };

    // expected: /admin/api/cat/list
    app.get('/cat/list', function(req, res) {
        pool.query('SELECT * FROM categories ORDER BY name ASC', function(error, result) {
            if( error ) {
                return res.status(500).send('Database Error').end();
            }
            res.json(result.rows);
        })
    });

    // expected: /admin/api/cat/add
    app.post('/cat/add', function(req, res) {
        // run input validations
        req.checkBody('name', 'Invalid Category Name')
            .isLength(1, 128)
            .matches(inputPattern.name);

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.status(400).send(errors).end();
        }

        // insert record to database
        pool.query('INSERT INTO categories (name) VALUES (?)', 
            [req.body.name],
            function(error, result) {
                if (error) {
                    return res.status(500).send('Database Error').end();
                }

                return res.status(200).json({
                    'success': true,
                }).end();
            }
        );
    });

    // expected: /admin/api/cat/(catid)/edit
    app.post('/cat/:id/edit', function(req, res) {
        // run input validations
        req.checkParams('id', 'Invalid Category ID')
            .notEmpty()
            .isInt();
        req.checkBody('name', 'Invalid Category Name')
            .isLength(1, 128)
            .matches(inputPattern.name);

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.status(400).send(errors).end();
        }

        // remove record from database
        pool.query('UPDATE categories SET name = ? WHERE catid = ? LIMIT 1', 
            [req.body.name, req.params.id],
            function(error, result) {
                if( error ) {
                    return res.status(500).send('Database Error').end();
                }

                // no rows are deleted
                if (result.affectedRows === 0) {
                    return res.status(400).send('Invalid Category ID').end();
                }

                return res.status(200).json({
                    'success': true,
                }).end();
            }
        );
    });

    // expected: /admin/api/cat/(catid)/delete
    app.post('/cat/:id/delete', function(req, res) {
        // run input validations
        req.checkParams('id', 'Invalid Category ID')
            .notEmpty()
            .isInt();

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if(errors) {
            return res.status(400).json({
                'message': errors,
            }).end();
        }

        // remove record from database
        pool.query('DELETE FROM categories WHERE catid = ? LIMIT 1', 
            [req.params.id],
            function(error, result) {
                if( error ) {
                    if( error.errno == 1451 ) {
                        // #1451: Cannot delete or update a parent row: a foreign key constraint fails
                        return res.status(400).send('One or more products are in this category.').end();

                    } else {
                        return res.status(500).send('Database Error').end();
                    }
                }

                // no rows are deleted
                if (result.affectedRows === 0) {
                    return res.status(400).send('Invalid Category ID').end();
                }

                return res.status(200).json({
                    'success': true,
                }).end();
            }
        );
    });

    // expected: /admin/api/cat/(catid)/list
    app.get('/cat/:id/list', function(req, res) {
        // run input validations
        req.checkParams('id', 'Invalid Category ID')
            .notEmpty()
            .isInt();

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.status(400).send(errors).end();
        }

        pool.query('SELECT * FROM products WHERE catid = ?',
            [req.params.id],
            function(error, result) {
            if( error ) {
                return res.status(500).send('Database Error').end();
            }
            res.json(result.rows);
        })
    });

    // expected: /admin/api/prod/add
    app.post('/prod/add', function(req, res) {
        // run input validations
        req.checkBody('name', 'Invalid Product Name')
            .isLength(1, 128)
            .matches(inputPattern.name);

        req.checkBody('catid', 'Invalid Category ID')
            .notEmpty()
            .isInt();

        req.checkBody('price', 'Invalid Price')
            .notEmpty()
            .matches(inputPattern.price);

        req.checkBody('description', 'Invalid Description')
            .optional()
            .matches(inputPattern.description);

        if( typeof req.files.photo == 'undefined' ||
            allowedImageExtension.indexOf(req.files.photo.extension) == -1 ||
            allowedImageMimeType.indexOf(req.files.photo.mimetype) == -1 ) {
                var errors = 'Invalid Photo Upload';
                return res.redirect(303, '/admin/products/#?op=failed&reason=' + encodeURIComponent(errors).replace(/%20/g, '+'));
        }

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.redirect(303, '/admin/products/#?op=failed&reason=' + encodeURIComponent(errors).replace(/%20/g, '+'));
        }

        // process photo and insert record to database
        var description = (typeof req.body.description != 'undefined') ? req.body.description : '';
        var image_extension = req.files.photo.extension.toLowerCase();

        pool.query('INSERT INTO products (catid, name, price, description, image_extension) VALUES (?, ?, ?, ?, ?)', 
            [req.body.catid, req.body.name, req.body.price, description, image_extension],
            function(error, result) {
                if( error ) {
                    if( error.errno == 1452 ) {
                        // #1452: Cannot add or update a child row: a foreign key constraint fails
                        var errors = 'Invalid Category ID';
                    } else {
                        var errors = 'Database Error';
                    }

                    return res.redirect(303, '/admin/products/#?op=failed&reason=' + encodeURIComponent(errors).replace(/%20/g, '+'));
                }

                var pid = result.lastInsertId;
                fs.rename(req.files.photo.path, __dirname + '/../public/images/products/' + pid + '.' + image_extension);

                res.redirect(303, '/admin/products/#?op=ok.added&catid=' + req.body.catid);
            }
        );
    });

    // expected: /admin/api/prod/(pid)
    app.get('/prod/:id', function(req, res) {
        // run input validations
        req.checkParams('id', 'Invalid Product ID')
            .notEmpty()
            .isInt();

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.status(400).send(errors).end();
        }

        pool.query('SELECT * FROM products WHERE pid = ? LIMIT 1',
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
        });
    });

    // expected: /admin/api/prod/(pid)/edit
    app.post('/prod/:id/edit', function(req, res) {
        // run input validations
        req.checkParams('id', 'Invalid Product ID')
            .notEmpty()
            .isInt();

        req.checkBody('name', 'Invalid Product Name')
            .isLength(1, 128)
            .matches(inputPattern.name);

        req.checkBody('catid', 'Invalid Category ID')
            .notEmpty()
            .isInt();

        req.checkBody('price', 'Invalid Price')
            .notEmpty()
            .matches(inputPattern.price);

        req.checkBody('description', 'Invalid Description')
            .optional()
            .matches(inputPattern.description);

        if( typeof req.files.photo != 'undefined' &&
            ( allowedImageExtension.indexOf(req.files.photo.extension) == -1 ||
              allowedImageMimeType.indexOf(req.files.photo.mimetype) == -1 ) ) {
                var errors = 'Invalid Photo Upload';
                return res.redirect(303, '/admin/products/#?op=failed&reason=' + encodeURIComponent(errors).replace(/%20/g, '+'));
        }

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.redirect(303, '/admin/products/#?op=failed&reason=' + encodeURIComponent(errors).replace(/%20/g, '+'));
        }

        // update query callback
        var queryCallback = function(error, result, successCall) {
            if( error ) {
                if( error.errno == 1452 ) {
                    // #1452: Cannot add or update a child row: a foreign key constraint fails
                    var errors = 'Invalid Category ID';
                } else {
                    var errors = 'Database Error';
                }

                return res.redirect(303, '/admin/products/#?op=failed&reason=' + encodeURIComponent(errors).replace(/%20/g, '+'));
            }

            // no rows are deleted
            if (result.affectedRows === 0) {
                var errors = 'Invalid Product ID';
                return res.redirect(303, '/admin/products/#?op=failed&reason=' + encodeURIComponent(errors).replace(/%20/g, '+'));
            }

            if( typeof successCall != 'undefined' ) {
                successCall();
            }

            res.redirect(303, '/admin/products/#?op=ok.edited&catid=' + req.body.catid);
        };

        // prepare new value
        var description = (typeof req.body.description != 'undefined') ? req.body.description : '';

        // update database
        if( typeof req.files.photo == 'undefined' ) {
            // product image NOT to be replaced
            pool.query('UPDATE products SET catid = ?, name = ?, price = ?, description = ? WHERE pid = ? LIMIT 1', 
                [req.body.catid, req.body.name, req.body.price, description, req.params.id],
                queryCallback
            );

        } else {
            // product image IS to be replaced
            var image_extension = req.files.photo.extension.toLowerCase();

            pool.query('UPDATE products SET catid = ?, name = ?, price = ?, description = ?, image_extension = ? WHERE pid = ? LIMIT 1', 
                [req.body.catid, req.body.name, req.body.price, description, image_extension, req.params.id],
                function(error, result) {
                    queryCallback(error, result, function() {
                        var pid = parseInt(req.params.id);
                        var targetFile = __dirname + '/../public/images/products/' + pid + '.' + image_extension;

                        // replace product image if success
                        fs.rename(req.files.photo.path, targetFile);
                    });
                }
            );
        }
    });

    // expected: /admin/api/prod/(pid)/delete
    app.post('/prod/:id/delete', function(req, res) {
        // run input validations
        req.checkParams('id', 'Invalid Product ID')
            .notEmpty()
            .isInt();

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.status(400).send(errors).end();
        }

        // remove record from database
        pool.query('DELETE FROM products WHERE pid = ? LIMIT 1', 
            [req.params.id],
            function(error, result) {
                if( error ) {
                    return res.status(500).send('Database Error').end();
                }

                // no rows are deleted
                if (result.affectedRows === 0) {
                    return res.status(400).send('Invalid Product ID').end();
                }

                // remove all product images in allowed extensions
                for(var i = 0; i < allowedImageExtension.length; i++) {
                    var pid = parseInt(req.params.id);
                    var targetFile = __dirname + '/../public/images/products/' + pid + '.' + allowedImageExtension[i];
                    
                    if( fs.existsSync(targetFile) ) {
                        fs.unlink(targetFile);
                    }
                }

                return res.status(200).json({
                    'success': true,
                }).end();
            }
        );
    });

    return app;
};
