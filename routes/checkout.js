var express = require('express');
    bodyParser = require('body-parser'),
    uuid = require('node-uuid'),
    paypal = require('paypal-rest-sdk');

module.exports = function(pool, config, redisClient) {
    var app  = express.Router();

    // configure paypal environment
    paypal.configure({
        'mode': 'sandbox',
        'client_id': config.paypalId,
        'client_secret': config.paypalSecret
    });

    // parse json post body
    app.use(bodyParser.json());

    // expected: POST /checkout
    app.post('/', function(req, res) {
        var resposne = {};
        var emptyCart = true;

        if( req.session && req.session.authenticated && req.session.is_admin ) {
            // admin user can't checkout any order
            resposne.redirect = '/admin';

        } else {
            // process cart data
            var pendingCart = {};

            if( typeof req.body == "object" ) {
                Object.keys(req.body).forEach(function(key) {
                    var pid = parseInt(req.body[key].pid);
                    var qty = parseInt(req.body[key].qty);

                    if( pid > 0 && qty > 0 ) {
                        pendingCart[pid] = qty;
                    }
                });

                emptyCart = ( Object.keys(pendingCart).length == 0 );
            }

            if( emptyCart ) {
                // 400 error if empty cart received
                return res.status(400).end();

            } else {
                // insert as pendingCart in redis store
                var cartId = uuid.v4();
                redisClient.set('cart:' + cartId, JSON.stringify(pendingCart));

                // set pendingCart id into cookie
                res.cookie('pendingCart', cartId, {
                    path: '/checkout',
                    signed: true,
                    httpOnly: true
                });

                // redirect user to another page to proceed
                if( req.session && req.session.authenticated ) {
                    // valid user, proceed to /checkout
                    resposne.redirect = '/checkout';

                } else {
                    // ask user signing in to continue
                    resposne.redirect = '/account/login/checkout';
                }
            }
        }

        res.status(200).json(resposne).end();
    });

    // expected: GET /checkout
    app.get('/', function(req, res) {
        var isAdmin = ( req.session && req.session.authenticated && req.session.is_admin );
        var isValidUser = ( req.session && req.session.authenticated );
        var hasPendingCart = ( typeof req.signedCookies['pendingCart'] != 'undefined' );

        if( isAdmin ) {
            // admin user can't checkout any order
            return res.redirect(302, '/admin');
        }

        if( !(isValidUser && hasPendingCart) ) {
            // user's status is not available to checkout
            return res.redirect(302, '/');
        }

        // obtain cart information from redis store
        var cartId = req.signedCookies['pendingCart'];

        redisClient.get('cart:' + cartId, function(err, reply) {
            if( err || reply == null ) {
                // redis store error or key not found
                return res.redirect(302, '/');
            }

            var cartItems = JSON.parse(reply.toString());

            // build where clause for all pids
            var whereClause = Object.keys(cartItems).join(',');

            // query all products information
            pool.query('SELECT pid, name, price FROM products WHERE pid in (' + whereClause + ') ORDER BY name ASC',
                function(error, result) {
                    if( error ) {
                        return res.redirect(302, '/checkout/error?message=server_error');
                    }

                    // no existing products match the pids
                    if( result.rowCount == 0 ) {
                        return res.redirect(302, '/checkout/error?message=empty_cart');
                    } 

                    // build payment json base on all found products information
                    var items = [];
                    var total_amount = 0.0;

                    for( var i = 0; i < result.rowCount; i++ ) {
                        items.push({
                            "name": result.rows[i].name,
                            "sku": "P#" + result.rows[i].pid,
                            "price": result.rows[i].price.toFixed(2),
                            "currency": "USD",
                            "quantity": cartItems[result.rows[i].pid]
                        });

                        total_amount += cartItems[result.rows[i].pid] * result.rows[i].price;
                    }

                    var payment_json = {
                        "intent": "sale",
                        "payer": {
                            "payment_method": "paypal"
                        },
                        "redirect_urls": {
                            "return_url": config.baseUri + "/checkout/thankyou",
                            "cancel_url": config.baseUri + "/checkout/error"
                        },
                        "transactions": [{
                            "item_list": {
                                "items": items
                            },
                            "amount": {
                                "total": total_amount.toFixed(2),
                                "currency": "USD"
                            },
                            "description": "IERG4210 Rilakkuma Store"
                        }]
                    };

                    paypal.payment.create(payment_json, function(error, payment) {
                        if( error ) {
                            return res.redirect(302, '/checkout/error?message=paypal_error');
                        }

                        // payment created, insert a user-specific database record
                        pool.query('INSERT INTO payments (userid, paymentId, state, dateCreated) VALUES (?, ?, ?, NOW());',
                            [req.session.uid, payment.id, payment.state],
                            function(error, result) {
                                if( error ) {
                                    return res.redirect(302, '/checkout/error?message=server_error');
                                }

                                // remove pendingCart in redis store
                                redisClient.del('cart:' + cartId, function(err, reply) {
                                    // ignore redis error because it is not important to this payment now,
                                    // then redirect user to approval_url
                                    for (var index = 0; index < payment.links.length; index++) {
                                        if (payment.links[index].rel === 'approval_url') {
                                            res.redirect(302, payment.links[index].href);
                                        }
                                    }
                                });
                            }
                        );
                    });
                }
            );
        });
    });

    app.get('/error', function(req, res) {
        res.status(200).end();
    });

    app.get('/thankyou', function(req, res) {
        res.status(200).end();
    });

    return app;
};
