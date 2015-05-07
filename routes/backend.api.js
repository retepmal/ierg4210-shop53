var express = require('express'),
    expressValidator = require('express-validator'),
    bodyParser = require('body-parser'),
    fs = require('fs'),
    util = require('util'),
    multer = require('multer'),
    AWS = require('aws-sdk'),
    uuid = require('uuid'),
    path = require('path'),
    slug = require('slug'),
    crypto = require('crypto');

module.exports = function(pool, config) {
    var app  = express.Router();

    var allowedImageExtension = ['gif', 'GIF', 'jpg', 'JPG', 'png', 'PNG', 'jpeg'],
        allowedImageMimeType = ['image/gif', 'image/png', 'image/jpeg'];

    // setup aws sdk and s3 environment
    AWS.config.update({accessKeyId: config.awsAccessKey, secretAccessKey: config.awsSecretKey, region: config.awsRegion});
    var photoBucket = new AWS.S3({params: {Bucket: config.s3ImagesBucket}});

    // set default slug mode to rfc3986
    slug.defaults.mode = 'rfc3986';

    app.use(bodyParser.urlencoded({extended:true}));
    // this line must be immediately after express.bodyParser()!
    app.use(expressValidator({
        errorFormatter: function(param, msg, value) {
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

        var semantic_name = slug(req.body.name);

        // insert record to database
        pool.query('INSERT INTO categories (name, slug) VALUES (?, ?)',
            [req.body.name, semantic_name],
            function(error, result) {
                if( error ) {
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

        var semantic_name = slug(req.body.name);

        // remove record from database
        pool.query('UPDATE categories SET name = ?, slug = ? WHERE catid = ? LIMIT 1',
            [req.body.name, semantic_name, req.params.id],
            function(error, result) {
                if( error ) {
                    return res.status(500).send('Database Error').end();
                }

                // no rows are deleted
                if( result.affectedRows === 0 ) {
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
        if( errors ) {
            return res.status(400).send(errors).end();
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

        // upload product image to s3 and insert record when calling back
        var targetFile = uuid.v4() + "." + req.files.photo.extension.toLowerCase();

        photoBucket.upload({
            ACL: 'public-read',
            Body: fs.createReadStream(req.files.photo.path),
            Key: targetFile,
            ContentType: 'application/octet-stream' // force download if it's accessed as a top location
        }).send(function(err, data) {
            if( err ) {
                var errors = 'Failed to upload to S3';
                return res.redirect(303, '/admin/products/#?op=failed&reason=' + encodeURIComponent(errors).replace(/%20/g, '+'));
            }

            var semantic_name = slug(req.body.name);
            var description = (typeof req.body.description != 'undefined') ? req.body.description : '';

            pool.query('INSERT INTO products (catid, name, slug, price, description, s3_image_path) VALUES (?, ?, ?, ?, ?, ?)',
                [req.body.catid, req.body.name, semantic_name, req.body.price, description, data.Location],
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
                    res.redirect(303, '/admin/products/#?op=ok.added&catid=' + req.body.catid);
                }
            );
        });
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
        var queryCallback = function(error, result) {
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
            if( result.affectedRows === 0 ) {
                var errors = 'Invalid Product ID';
                return res.redirect(303, '/admin/products/#?op=failed&reason=' + encodeURIComponent(errors).replace(/%20/g, '+'));
            }

            res.redirect(303, '/admin/products/#?op=ok.edited&catid=' + req.body.catid);
        };

        // prepare new value
        var semantic_name = slug(req.body.name);
        var description = (typeof req.body.description != 'undefined') ? req.body.description : '';

        // update database
        if( typeof req.files.photo == 'undefined' ) {
            // product image NOT to be replaced
            pool.query('UPDATE products SET catid = ?, name = ?, slug = ?, price = ?, description = ? WHERE pid = ? LIMIT 1',
                [req.body.catid, req.body.name, semantic_name, req.body.price, description, req.params.id],
                queryCallback
            );

        } else {
            // product image IS to be replaced

            var s3RemoveObject = function(filename, callback) {
                photoBucket.deleteObject({Key: filename}, callback);
            };

            var s3UploadObject = function(localFile, targetFile, callback) {
                photoBucket.upload({
                    ACL: 'public-read',
                    Body: fs.createReadStream(localFile),
                    Key: targetFile,
                    ContentType: 'application/octet-stream' // force download if it's accessed as a top location
                }).send(callback);
            }

            // query the database for product record
            pool.query('SELECT s3_image_path FROM products WHERE pid = ? LIMIT 1',
                [req.params.id],
                function(error, result) {
                    if( error ) {
                        var errors = 'Database Error';
                        return res.redirect(303, '/admin/products/#?op=failed&reason=' + encodeURIComponent(errors).replace(/%20/g, '+'));
                    }

                    // no rows are deleted
                    if( result.affectedRows === 0 ) {
                        var errors = 'Invalid Product ID';
                        return res.redirect(303, '/admin/products/#?op=failed&reason=' + encodeURIComponent(errors).replace(/%20/g, '+'));
                    }

                    var oldImage = path.basename(result.rows[0].s3_image_path);
                    var newImage = uuid.v4() + "." + req.files.photo.extension.toLowerCase();

                    s3UploadObject(req.files.photo.path, newImage, function(err, data) {
                        if( err ) {
                            var errors = 'Failed to upload to S3';
                            return res.redirect(303, '/admin/products/#?op=failed&reason=' + encodeURIComponent(errors).replace(/%20/g, '+'));
                        }

                        s3RemoveObject(oldImage, function() {
                            // ignore error for removing object

                            // update database record
                            pool.query('UPDATE products SET catid = ?, name = ?, slug = ?, price = ?, description = ?, s3_image_path = ? WHERE pid = ? LIMIT 1',
                                [req.body.catid, req.body.name, semantic_name, req.body.price, description, data.Location, req.params.id],
                                queryCallback
                            );
                        });
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

        // query the database for product record
        pool.query('SELECT s3_image_path FROM products WHERE pid = ? LIMIT 1',
            [req.params.id],
            function(error, result) {
                if( error ) {
                    return res.status(500).send('Database Error').end();
                }

                // no rows are deleted
                if( result.rows.length === 0 ) {
                    return res.status(400).send('Invalid Product ID').end();
                }

                var s3FileKey = path.basename(result.rows[0].s3_image_path);

                // remove record from database
                pool.query('DELETE FROM products WHERE pid = ? LIMIT 1',
                    [req.params.id],
                    function(error, result) {
                        if( error ) {
                            return res.status(500).send('Database Error').end();
                        }

                        // no rows are deleted
                        if( result.affectedRows === 0 ) {
                            return res.status(400).send('Invalid Product ID').end();
                        }

                        // remove product image from s3 bucket
                        photoBucket.deleteObject({Key: s3FileKey}, function(err, data) {
                            // ignore error and return
                            return res.status(200).json({
                                'success': true,
                            }).end();
                        });
                    }
                );
            });
        }
    );

    // expected: /admin/api/newpassword
    app.post('/newpassword', function(req, res) {
        // run input validations
        req.checkBody('password', 'Current Password')
            .notEmpty()
            .isLength(8);
        req.checkBody('newPassword', 'New Password')
            .notEmpty()
            .isLength(8);

        // reject when any validation error occurs
        var errors = req.validationErrors();
        if( errors ) {
            return res.status(400).send(errors).end();
        }

        var userid = req.session.uid;

        var changePassword = function() {
            var salt = crypto.randomBytes(32).toString('base64');
            var saltedPassword = crypto.createHmac('sha256', salt);
                saltedPassword.update(req.body.newPassword);

            pool.query('UPDATE users SET salt = ?, password = ? WHERE uid = ? LIMIT 1',
                [salt, saltedPassword.digest('base64'), userid],
                function(error, result) {
                    if( error || result.affectedRows === 0 ) {
                        return res.status(500).send('Database Error').end();
                    }

                    req.session.destroy();
                    return res.status(200).end();
                }
            );
        }

        // check is the password correct
        pool.query('SELECT salt, password FROM users WHERE uid = ? LIMIT 1',
            [userid],
            function(error, result) {
                if( error ) {
                    return res.status(500).send('Database Error').end();
                }

                if( result.rowCount > 0 ) {
                    var salt = result.rows[0].salt;
                    var hmac = crypto.createHmac('sha256', salt);

                    hmac.update(req.body.password);
                    if( hmac.digest('base64') == result.rows[0].password ) {
                        // verified password, start changing password
                        changePassword();

                    } else {
                        // password is wrong
                        return res.status(401).send('Incorrect current password').end();
                    }

                } else {
                    // shouldn't reach here, no account found?
                    return res.status(500).send('Database Error').end();
                }
            }
        );
    });

    return app;
};
