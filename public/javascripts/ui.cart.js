(function(){
    var cart = window.cart = {};

    var productInfo = {};
    var compiledTemplate = {};
    cart.init = function() {
        // read localStorage to render products in cart to page
        renderCart();

        // bind checkout button event
        $("button.cart-checkout").click(function() {
            cart.checkout();
        });
    };

    // use try-catch to prevent invalid data in localStorage
    var readLocalStorage = function() {
        try {
            var cartJSON = JSON.parse(localStorage.getItem('cart'));

            // re-initialize cart if JSON is not an Array
            if( Array.isArray(cartJSON) ) {
                return cartJSON;
            } else {
                return initCart();
            }

        } catch(e) {
            return initCart();
        }
    }

    var saveLocalStorage = function(data) {
        localStorage.setItem('cart', JSON.stringify(data));
    }

    // initialize cart data structure in localStorage
    var initCart = function() {
        var initData = [];
        saveLocalStorage(initData);

        return initData;
    }

    var renderCart = function() {
        var cartItems = readLocalStorage();

        // prepare list of pid to request their informations
        var productIds = [];
        $.each(cartItems, function(k, v) {
            if( parseInt(v.pid) > 0 ) {
               productIds.push( parseInt(v.pid) );
            }
        });

        if( productIds.length > 0 ) {
            $.ajax({
                type: "POST",
                url: "/cart/products",
                data: JSON.stringify(productIds),
                contentType: 'application/json',
                processData: false,
                dataType: "json",
            }).done(function(response) {
                var tplVars = {};
                var cartTotal = 0.0;

                // process response
                $.each(response, function(k, v) {
                    productInfo[v.pid] = {
                        name: v.name,
                        catid: v.catid,
                        price: v.price,
                    };
                });

                // set variables for rendering template
                var processedCart = [], isItemRemoved = false;
                tplVars.products = [];

                $.each(cartItems, function(k, v) {
                    if( typeof productInfo[v.pid] != "undefined" ) {
                        tplVars.products.push({
                            pid: v.pid,
                            name: productInfo[v.pid].name,
                            catid: productInfo[v.pid].catid,
                            price: productInfo[v.pid].price,
                            qty: v.qty,
                        });
                        processedCart.push(v);

                        cartTotal = cartTotal + v.qty * productInfo[v.pid].price;
                    } else {
                        isItemRemoved = true;
                    }
                });

                // save processed cart, any removed products won't exist in cart
                // for example, product being removed after user placed it into cart
                if( isItemRemoved ) {
                    saveLocalStorage(processedCart);
                }

                // compile "cart-detail-tpl" if needed
                if( typeof compiledTemplate.cartDetail == "undefined" ) {
                    compiledTemplate.cartDetail = Handlebars.compile($("#cart-detail-tpl").html());
                }

                // render cart and show total amount
                updateCartAmount(cartTotal);  
                $("#cart-product-list").html(
                    compiledTemplate.cartDetail(tplVars)
                );
                $("#cart-product-list a.xhr-enable").click(function(event) {
                    event.preventDefault();
                    frontend.clickLink(this);
                });

                // bind minus/plus buttons and qty change events
                $("button.cart-minus").click(function() {
                    var pid = $(this).parents("td").attr("data-pid");
                    var qty = $("td.cart-qty[data-pid=" + parseInt(pid) + "] input").val();

                    $("td.cart-qty[data-pid=" + parseInt(pid) + "] input").val(parseInt(qty) - 1);
                    cart.updateQty(pid);
                });
                $("button.cart-plus").click(function() {
                    var pid = $(this).parents("td").attr("data-pid");
                    var qty = $("td.cart-qty[data-pid=" + parseInt(pid) + "] input").val();

                    $("td.cart-qty[data-pid=" + parseInt(pid) + "] input").val(parseInt(qty) + 1);
                    cart.updateQty(pid);
                });
                $("td.cart-qty input").change(function() {
                    var pid = $(this).parents("td").attr("data-pid");
                    cart.updateQty(pid);
                });
            });
        } else {
            $("#cart-product-list").html('');
            updateCartAmount(0);
        }
    }

    // define function to update total amount in page
    var updateCartAmount = function(amount) {
        // update cart total amount
        $("span#cart-amount").text(amount.toFixed(2));

        // enable checkout button if product exists in cart
        if( amount > 0 ) {
            $("button.cart-checkout").show();
        } else {
            $("button.cart-checkout").hide();
        }
    }

    cart.add = function(pid) {
        var cartItems = readLocalStorage();

        var existsInCart = false;
        $.each(cartItems, function(k, v) {
            if( v.pid == pid ) {
                existsInCart = true;
                v.qty++;
            }
        });

        // create new entry in cart if it is not exist before
        if( !existsInCart) {
            cartItems.push({
                pid: pid,
                qty: 1,
            });
        }

        // save updated cart
        saveLocalStorage(cartItems);

        // update cart in page
        renderCart();
    }

    cart.updateQty = function(pid) {
        var cartItems = readLocalStorage();

        var qty = $("td.cart-qty[data-pid=" + parseInt(pid) + "] input").val();

        if( qty <= 0 ) {
            // remove the related product
            var newCart = [];

            $.each(cartItems, function(k, v) {
                if( v.pid != pid ) {
                    newCart.push(v);
                }
            });

            // save updated cart
            saveLocalStorage(newCart);

            // update cart in page
            renderCart();

        } else {
            var newAmount = 0.0;

            // update the new qty for product
            $.each(cartItems, function(k, v) {
                if( v.pid == pid ) {
                    v.qty = qty;
                }

                newAmount = newAmount + v.qty * productInfo[v.pid].price;
            });

            // save updated cart
            saveLocalStorage(cartItems);

            // update new cart total amount
            updateCartAmount(newAmount);
        }
    }

    cart.checkout = function() {}
})();

$(function() {
    cart.init();
});