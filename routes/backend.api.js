var util = require('util');
var express = require('express');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');

var anyDB  = require('any-db');
var config = require('../shop53.config.js');

var app  = express.Router();
var pool = anyDB.createPool(config.dbURI, {
    min: 2, max: 20
});

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

var inputPattern = {
    name: /^[\w- ']+$/,
};

// expected: /admin/api/cat/list
app.get('/cat/list', function (req, res) {
    pool.query('SELECT * FROM categories ORDER BY name ASC', function (error, result) {
        if(error) {
            return res.status(500).json({
                'message': 'Database Error',
            }).end();
        }
        res.json(result.rows);
    })
});

// expected: /admin/api/cat/add
app.post('/cat/add', function (req, res) {
    // run input validations
    req.checkBody('name', 'Invalid Category Name')
        .isLength(1, 128)
        .matches(inputPattern.name);

    // reject when any validation error occurs
    var errors = req.validationErrors();
    if(errors) {
        return res.status(400).json({
            'message': errors,
        }).end();
    }

    // insert record to database
    pool.query('INSERT INTO categories (name) VALUES (?)', 
        [req.body.name],
        function(error, result) {
            if (error) {
                return res.status(500).json({
                    'message': 'Database Error',
                }).end();
            }

            return res.status(200).json({
                'success': true,
            }).end();
        }
    );
});

// expected: /admin/api/cat/(catid)/edit
app.post('/cat/:id/edit', function (req, res) {
    // run input validations
    req.checkParams('id', 'Invalid Category ID')
        .notEmpty()
        .isInt();
    req.checkBody('name', 'Invalid Category Name')
        .isLength(1, 128)
        .matches(inputPattern.name);

    // reject when any validation error occurs
    var errors = req.validationErrors();
    if(errors) {
        return res.status(400).json({
            'message': errors,
        }).end();
    }

    // remove record from database
    pool.query('UPDATE categories SET name = ? WHERE catid = ? LIMIT 1', 
        [req.body.name, req.params.id],
        function(error, result) {
            if(error) {
                return res.status(500).json({
                    'message': 'Database Error',
                }).end();
            }

            // no rows are deleted
            if (result.affectedRows === 0) {
                return res.status(400).json({
                    'message': 'Invalid Category ID',
                }).end();
            }

            return res.status(200).json({
                'success': true,
            }).end();
        }
    );
});

// expected: /admin/api/cat/(catid)/delete
app.post('/cat/:id/delete', function (req, res) {
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
            if(error) {
                if( error.errno == 1451 ) {
                    // #1451: Cannot delete or update a parent row: a foreign key constraint fails
                    return res.status(400).json({
                        'message': 'One or more products are in this category.',
                    }).end();

                } else {
                    return res.status(500).json({
                        'message': 'Database Error',
                    }).end();
                }
            }

            // no rows are deleted
            if (result.affectedRows === 0) {
                return res.status(400).json({
                    'message': 'Invalid Category ID',
                }).end();
            }

            return res.status(200).json({
                'success': true,
            }).end();
        }
    );
});

module.exports = app;