var express = require('express'),
    crypto = require('crypto');

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

    // expected: /account/api/order/(payid)
    app.get('/order/:payid([0-9]+)', function(req, res) {
        pool.query('SELECT paymentId FROM payments WHERE userid = ? AND payid = ? LIMIT 1',
            [req.session.uid, req.params.payid],
            function(error, result) {
                if( error ) {
                    return res.status(500).send('Database Error').end();
                }

                // payment id not found
                if( result.rowCount == 0 ) {
                    return res.status(400).send('Order not found').end();
                }

                paypal.payment.get(result.rows[0].paymentId, function(error, payment) {
                    if( error ) {
                        return res.status(500).send('Paypal payment expired').end();
                    }

                    var response = {
                        state: payment.state,
                        paymentId: result.rows[0].paymentId,
                        created: payment.create_time,
                        updated: payment.update_time,
                        currency: payment.transactions[0].amount.currency,
                        total: payment.transactions[0].amount.total,
                        items: [],
                        retry: false
                    };

                    if( response.state != 'approved' ) {
                        for (var index = 0; index < payment.links.length; index++) {
                            if (payment.links[index].rel === 'approval_url') {
                                response.retry = payment.links[index].href;
                            }
                        }
                    }

                    // obtain a list of pids
                    var productInfo = {};
                    var productIds = [];
                    var whereClause = '';

                    for( var i = 0; i < payment.transactions[0].item_list.items.length; i++ ) {
                        var pid = parseInt(payment.transactions[0].item_list.items[i].sku.match(/^PID-([0-9]+)$/)[1]);
                        if( pid > 0 ) {
                            productIds.push(pid);
                            productInfo[pid] = {
                                pid: pid,
                                name: payment.transactions[0].item_list.items[i].name,
                                price: payment.transactions[0].item_list.items[i].price,
                                currency: payment.transactions[0].item_list.items[i].currency,
                                quantity: payment.transactions[0].item_list.items[i].quantity,
                            };
                        }
                    }
                    whereClause = productIds.join(',');

                    // query all product information
                    pool.query('SELECT pid, s3_image_path FROM products WHERE pid in (' + whereClause + ') ORDER BY pid ASC',
                        function(error, result) {
                        if( error ) {
                            return res.status(500).send('Database Error').end();
                        }

                        for( var i = 0; i < result.rowCount; i++ ){
                            var pid = parseInt(result.rows[i].pid);
                            if( typeof productInfo[pid] != 'undefined' ) {
                                productInfo[pid].image_path = result.rows[i].s3_image_path;
                                response.items.push(productInfo[pid]);
                            }
                        }

                        res.status(200).json(response).end();
                    });
                });
            }
        );
    });

    // expected: /account/api/newpassword
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
