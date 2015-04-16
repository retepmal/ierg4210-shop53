var express = require('express');

module.exports = function(pool) {
    var app  = express.Router();

    // expected: /account/api/orders
    app.get('/orders', function(req, res) {
        pool.query('SELECT payid, paymentId, state, DATE_FORMAT(dateCreated, "%Y/%c/%d %r") AS dateTime FROM payments WHERE userid = ? ORDER BY dateCreated ASC',
            [req.session.uid],
            function(error, result) {
                if( error ) {
                    return res.status(500).send('Database Error').end();
                }
                res.json(result.rows);
            }
        );
    });

    return app;
};
