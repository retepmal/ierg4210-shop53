$(function() {
    var uri = new URI();
    
    // clear localStorage if this is /checkout/thankyou page
    if( uri.pathname() == "/checkout/thankyou" ) {
        localStorage.removeItem('cart');
    }
});
