(function(){
    var product = window.product = {};

    var uri = new URI();
    var compiledTemplate = {};
    product.init = function() {
        // bind input and form events
        $("#product-list-by-category-id").change(function() { product.list(); });
        $("#product-list-refresh").click(function() { product.refresh(); });
        $("#product-list-add").click(function() { product.showInsertForm(); });

        // parse fragment query
        var state = uri.fragment(true);

        // load category list for selection
        updateCategoryOptions($("#product-list-by-category-id"), function() {
            if( typeof state.catid != 'undefined' ) {
                var catid = parseInt(state.catid);
                $("#product-list-by-category-id option").prop("selected", false);
                $("#product-list-by-category-id option[value=" + catid + "]").prop("selected", true);
                product.list();
            }

            if( typeof state.pid != 'undefined' ) {
                var pid = parseInt(state.pid);
                product.showEditForm(pid);
            }
        });

        if( typeof state.op != 'undefined' ) {
            var tpl, msg;

            switch(state.op) {
                case 'ok.added':
                    tpl = "#success-message-tpl";
                    msg = "Success! Product added.";
                    break;
                case 'ok.edited':
                    tpl = "#success-message-tpl";
                    msg = "Success! Product edited.";
                    break;
                case 'failed':
                    tpl = "#error-message-tpl";
                    msg = "Fail! Invalid form submitted.";
                    break;
            }

            if( typeof compiledTemplate[tpl] == "undefined" ) {
                compiledTemplate[tpl] = Handlebars.compile($(tpl).html());
            }

            var rendered = compiledTemplate[tpl]({message: msg});
            $("#product-list-message").html(rendered);
        }
    }

    var updateCategoryOptions = function(elem, callback) {
        callback = typeof callback !== 'undefined' ? callback : function() {};

        $.ajax({
            type: "GET",
            url: "/admin/api/cat/list",
            dataType: "json",
        }).done(function(response) {
            // compile "category-list-tpl" if needed
            if( typeof compiledTemplate.categoryList == "undefined" ) {
                compiledTemplate.categoryList = Handlebars.compile($("#category-list-tpl").html());
            }

            // render category list
            var rendered = compiledTemplate.categoryList({categories: response});

            // apply options to select
            $(elem).html(rendered);

            // invoke callback function
            callback();

        }).error(function(error) {
            // compile "error-message-tpl" if needed
            if( typeof compiledTemplate.errorMessage == "undefined" ) {
                compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
            }

            // incorrect response
            var rendered = compiledTemplate.errorMessage({message: error.responseText});
            $("#product-list-message").html(rendered);
        });
    }

    // refresh category list and product list (if valid category selected)
    product.refresh = function() {
        var categorySelected = $("#product-list-by-category-id").val();

        // refresh category list
        updateCategoryOptions($("#product-list-by-category-id"), function() {
            // select previous category
            $("#product-list-by-category-id option").prop("selected", false);

            if( parseInt(categorySelected) > 0 ) {
                $("#product-list-by-category-id option[value=" + categorySelected + "]").prop("selected", true);
            }

            // refresh product list
            product.list();
        });
    }

    // list product by category
    product.list = function() {
        var categorySelected = $("#product-list-by-category-id").val();

        if( parseInt(categorySelected) > 0 ) {
            // obtain product list by selected category
            $.ajax({
                type: "GET",
                url: "/admin/api/cat/" + parseInt(categorySelected) + "/list",
                dataType: "json",
            }).done(function(response) {
                // compile "product-list-tpl" if needed
                if( typeof compiledTemplate.productList == "undefined" ) {
                    compiledTemplate.productList = Handlebars.compile($("#product-list-tpl").html());
                }

                // render category list
                var rendered = compiledTemplate.productList({products: response});

                // apply options to select
                $("#product-list").html(rendered);

                // bind click events to product items
                $("#product-list div.panel-body.new-product").click(function() { product.showInsertForm(categorySelected); });
                $("#product-list div.panel-body:not(.new-product)").click(function() { product.showEditForm($(this).attr("data-pid")); });

                // update location hash
                uri.removeFragment("catid");
                uri.addFragment("catid", categorySelected);
                location.assign(uri.toString());

            }).error(function(error) {
                // compile "error-message-tpl" if needed
                if( typeof compiledTemplate.errorMessage == "undefined" ) {
                    compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
                }

                // incorrect response
                var rendered = compiledTemplate.errorMessage({message: error.responseText});
                $("#product-list-message").html(rendered);
            });

        } else {
            // no category is selected, clear product list and forms
            $("#product-list").text("");
            $("#product-list-message").text("");
        }
    }

    // show form for adding new product
    product.showInsertForm = function(catid) {
        // compile "add-product-form-tpl" if needed
        if( typeof compiledTemplate.productAddForm == "undefined" ) {
            compiledTemplate.productAddForm = Handlebars.compile($("#add-product-form-tpl").html());
        }

        var rendered = compiledTemplate.productAddForm();
        $("#product-list-forms").html(rendered);

        // select current category
        updateCategoryOptions($("#add-product-category-id"), function() {
            $("#add-product-category-id option").prop("selected", false);

            if( parseInt(catid) > 0 ) {
                $("#add-product-category-id option[value=" + catid + "]").prop("selected", true);
            }
        });

        // bind click event to button
        $("#add-product-submit").click(function() { product.add(this); });

        // update location hash
        uri.removeFragment("pid");
        location.assign(uri.toString());
    }

    // show form for editing current product
    product.showEditForm = function(productId) {
        $.ajax({
            type: "GET",
            url: "/admin/api/prod/" + parseInt(productId),
            dataType: "json",
        }).done(function(response) {
            // compile "edit-product-form-tpl" if needed
            if( typeof compiledTemplate.productEditForm == "undefined" ) {
                compiledTemplate.productEditForm = Handlebars.compile($("#edit-product-form-tpl").html());
            }

            // render product edit form
            var rendered = compiledTemplate.productEditForm(response);
            $("#product-list-forms").html(rendered);

            // select product's category
            updateCategoryOptions($("#edit-product-category-id"), function() {
                $("#edit-product-category-id option").prop("selected", false);
                $("#edit-product-category-id option[value=" + response.catid + "]").prop("selected", true);
            });

            // bind click event to buttons
            $("#edit-product-submit").click(function() { product.edit(this); });
            $("#edit-product-delete").click(function() { product.delete(this); });

            // update location hash
            uri.removeFragment("pid");
            uri.addFragment("pid", response.pid);
            location.assign(uri.toString());

        }).error(function(error) {
            // compile "error-message-tpl" if needed
            if( typeof compiledTemplate.errorMessage == "undefined" ) {
                compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
            }

            // incorrect response
            var rendered = compiledTemplate.errorMessage({message: error.responseText});
            $("#product-list-message").html(rendered);
        });
    }

    // insert new product to system
    product.add = function(btn) {
        var form = $(btn).parents("form");
        if( !checkForm(form) ) {
            return;
        }

        // use multipart/form-data upload the whole form
        form.submit();
    }

    // commit change of product information
    product.edit = function(btn) {
        var form = $(btn).parents("form");
        if( !checkForm(form) ) {
            return;
        }

        // use multipart/form-data upload the whole form
        form.submit();
    }

    // delete product from system
    product.delete = function(btn) {
        if( !confirm("Confirm to delete this product?") ) {
            return;
        }

        var form = $(btn).parents("form");
        var pid = parseInt($(form).attr("data-pid"));

        if( pid > 0 ) {
            $.ajax({
                type: "POST",
                url: "/admin/api/prod/" + pid + "/delete",
                dataType: "json",
            }).done(function(response) {
                // refesh product list in current category
                product.refresh();

                // compile "success-message-tpl" if needed
                if( typeof compiledTemplate.successMessage == "undefined" ) {
                    compiledTemplate.successMessage = Handlebars.compile($("#success-message-tpl").html());
                }

                // show error message
                var rendered = compiledTemplate.successMessage({message: "Success! Product removed."});
                $("#product-list-message").html(rendered);
                $("#product-list-forms").text("");

                // update location hash
                uri.removeFragment("pid");
                location.assign(uri.toString());

            }).error(function(error) {
                // compile "error-message-tpl" if needed
                if( typeof compiledTemplate.errorMessage == "undefined" ) {
                    compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
                }

                // show error message
                var rendered = compiledTemplate.errorMessage({message: error.responseText});
                $("#product-list-message").html(rendered);
            })
        }
    }

    // private function: check form validity
    var checkForm = function(form) {
        $("#product-list-message").text("");
        var invalidFields = [];

        $.each($(form).find("input, select, textarea"), function(k, v) {
            $(v).parent().removeClass("has-error");

            var valid = false;

            if( v.type == "textarea" ) {
                var re = new RegExp($(v).attr("pattern").replace('-', '\\-'));
                valid = re.test($(v).val());
            } else {
                valid = v.checkValidity();
            }

            if( !valid ) {
                invalidFields.push($("label[for=" + $(v).attr("id") + "]").text());
                $(v).parent().addClass("has-error");
            }
        });

        // show error if there is any invalid fields
        if( invalidFields.length > 0 ) {
            // compile "warn-invalid-form-tpl" if needed
            if( typeof compiledTemplate.warnInvalidForm == "undefined" ) {
                compiledTemplate.warnInvalidForm = Handlebars.compile($("#warn-invalid-form-tpl").html());
            }
            // compile "error-message-tpl" if needed
            if( typeof compiledTemplate.errorMessage == "undefined" ) {
                compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
            }

            var message = compiledTemplate.warnInvalidForm({fields: invalidFields});
            var rendered = compiledTemplate.errorMessage({message: message});
            $("#product-list-message").html(rendered);
            return false;
        } else {
            return true;
        }
    }
})();

$(function() {
    product.init();
});