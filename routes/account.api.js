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
                    pool.query('SELECT pid, image_extension FROM products WHERE pid in (' + whereClause + ') ORDER BY pid ASC',
                        function(error, result) {
                        if( error ) {
                            return res.status(500).send('Database Error').end();
                        }

                        for( var i = 0; i < result.rowCount; i++ ){
                            var pid = parseInt(result.rows[i].pid);
                            if( typeof productInfo[pid] != 'undefined' ) {
                                productInfo[pid].image_extension = result.rows[i].image_extension;
                                response.items.push(productInfo[pid]);
                            }
                        }

                        res.status(200).json(response).end();
                    });
                });
            }
        );
    });

    return app;
};
