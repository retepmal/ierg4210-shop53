(function(){
    var order = window.order = {};

    var compiledTemplate = {};
    order.init = function() {
        // load order list
        order.loadOrders();
    }

    order.loadOrders = function() {
        $.ajax({
            type: "GET",
            url: "/account/api/orders",
            dataType: "json",
        }).done(function(response) {
            if( Array.isArray(response) ) {
                if( response.length == 0 ) {
                    // compile "order-list-empty-tpl" if needed
                    if( typeof compiledTemplate.orderEmpty == "undefined" ) {
                        compiledTemplate.orderEmpty = Handlebars.compile($("#order-list-empty-tpl").html());
                    }

                    // empty order list
                    var rendered = compiledTemplate.orderEmpty();
                    $("#user-order-list tbody").html(rendered);

                    return;
                }

                // add labelClass based on the state
                $.each(response, function(k, v) {
                    v.labelClass = ( v.state == "approved" ) ? "label-success": "label-warning";
                });

                // compile "order-list-item-tpl" if needed
                if( typeof compiledTemplate.orderItems == "undefined" ) {
                    compiledTemplate.orderItems = Handlebars.compile($("#order-list-item-tpl").html());
                }

                // show order list with items
                var rendered = compiledTemplate.orderItems({items: response});
                $("#user-order-list tbody").html(rendered);

                // bind click event for payment ids
                $(".order-item").click(function() {
                    order.loadDetails($(this).attr("data-pid"));
                })
            }

        }).error(function(error) {
            // compile "error-message-tpl" if needed
            if( typeof compiledTemplate.errorMessage == "undefined" ) {
                compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
            }

            // incorrect response
            var rendered = compiledTemplate.errorMessage({message: error.responseText});
            $("#user-order-content").html(rendered);
        });
    }

    order.loadDetails = function(pid) {
        // compile "loading-message-tpl" if needed
        if( typeof compiledTemplate.loadingMessage == "undefined" ) {
            compiledTemplate.loadingMessage = Handlebars.compile($("#loading-message-tpl").html());
        }

        var rendered = compiledTemplate.loadingMessage();
        $("#user-order-content").html(rendered);

        $.ajax({
            type: "GET",
            url: "/account/api/order/" + pid,
            dataType: "json",
        }).done(function(response) {
            // determine the label class
            switch( response.state ) {
                case "approved":
                    response.labelClass = "label-success";
                    response.panelClass = "panel-info";
                    break;

                case "created":
                default:
                    response.labelClass = "label-primary";
                    response.panelClass = "panel-warning";
                    break;
            }

            // parse created and updated data to more readable
            var created = moment(response.created);
            var updated = moment(response.updated);

            response.created = created.format("YYYY/D/M hh:mm:ss A");
            response.updated = updated.format("YYYY/D/M hh:mm:ss A");

            // compile "order-detail-tpl" if needed
            if( typeof compiledTemplate.orderDetails == "undefined" ) {
                compiledTemplate.orderDetails = Handlebars.compile($("#order-detail-tpl").html());
            }

            // incorrect response
            var rendered = compiledTemplate.orderDetails(response);
            $("#user-order-content").html(rendered);

        }).error(function(error) {
            // compile "error-message-tpl" if needed
            if( typeof compiledTemplate.errorMessage == "undefined" ) {
                compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
            }

            // incorrect response
            var rendered = compiledTemplate.errorMessage({message: error.responseText});
            $("#user-order-content").html(rendered);
        });
    }
})();

$(function() {
    order.init();
});
