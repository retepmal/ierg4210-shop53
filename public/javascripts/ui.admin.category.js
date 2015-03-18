(function(){
    var category = window.category = {};

    var categoryListIds = ['#edit-category-id', '#remove-category-id'];
    var compiledTemplate = {};
    category.init = function() {
        // bind click event for category page buttons
        $("#add-category form button").click(function() { category.add(); });
        $("#edit-category form button").click(function() { category.edit(); });
        $("#edit-category form select").change(function() { category.selectForEdit(); });
        $("#remove-category form button").click(function() { category.remove(); });

        // disable enter key in all forms
        $.each(["#add-category form", "#edit-category form", "#remove-category form"], function(k, v) {
            $(v).submit(function() {
                return false;
            });
        });

        // init page with obtaining category list
        category.refreshSelect();
    }

    // refresh category list (select options) for all select in categoryListIds
    category.refreshSelect = function() {
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

            // apply to all selects
            $.each(categoryListIds, function(k, v) {
                $(v).html(rendered);
            });

        }).error(function(error) {
            // compile "error-message-tpl" if needed
            if( typeof compiledTemplate.errorMessage == "undefined" ) {
                compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
            }

            // incorrect response
            var rendered = compiledTemplate.errorMessage({message: error.responseText});
            $("#add-category .message").html(rendered);
        });
    }

    // add a category
    category.add = function() {
        var invalidFields = checkForm($("#add-category form")[0]);

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

            $("#add-category .message").html(rendered);
            return;
        }

        // disable add button
        $("#add-category button").prop('disabled', true);

        $.ajax({
            type: "POST",
            url: "/admin/api/cat/add",
            data: $("#add-category form").serialize(),
            dataType: "json",
        }).done(function(response) {
            // clear form
            $("#add-category form").find("input, select").val("");

            // refesh all selects in page
            category.refreshSelect();

            // compile "success-message-tpl" if needed
            if( typeof compiledTemplate.successMessage == "undefined" ) {
                compiledTemplate.successMessage = Handlebars.compile($("#success-message-tpl").html());
            }

            // show success message
            var rendered = compiledTemplate.successMessage({message: "Success! Category added."});
            $("#add-category .message").html(rendered);

        }).error(function(error) {
            // compile "error-message-tpl" if needed
            if( typeof compiledTemplate.errorMessage == "undefined" ) {
                compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
            }

            // incorrect response
            var rendered = compiledTemplate.errorMessage({message: error.responseText});
            $("#add-category .message").html(rendered);

        }).complete(function() {
            // enable add button
            $("#add-category button").prop('disabled', false);
        });
    }

    // change name field into existing name for editing function
    category.selectForEdit = function() {
        var currentCartId = $("#edit-category-id").val();
        if( parseInt(currentCartId) > 0 ) {
            $("#edit-category-new-name").val(
                $("#edit-category-id [value=" + currentCartId + "]").text()
            );
        } else {
            $("#edit-category-new-name").val("");
        }
    }

    // edit a category
    category.edit = function() {
        var invalidFields = checkForm($("#edit-category form")[0]);

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

            $("#edit-category .message").html(rendered);
            return;
        }

        // disable add button
        $("#edit-category button").prop('disabled', false);

        $.ajax({
            type: "POST",
            url: "/admin/api/cat/" + parseInt($("#edit-category-id").val()) + "/edit",
            data: $("#edit-category form").serialize(),
            dataType: "json",
        }).done(function(response) {
            // clear form
            $("#edit-category form").find("input, select").val("");

            // refesh all selects in page
            category.refreshSelect();

            // compile "success-message-tpl" if needed
            if( typeof compiledTemplate.successMessage == "undefined" ) {
                compiledTemplate.successMessage = Handlebars.compile($("#success-message-tpl").html());
            }

            // show success message
            var rendered = compiledTemplate.successMessage({message: "Success! Category edited."});
            $("#edit-category .message").html(rendered);

        }).error(function(error) {
            // compile "error-message-tpl" if needed
            if( typeof compiledTemplate.errorMessage == "undefined" ) {
                compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
            }

            // show error message
            var rendered = compiledTemplate.errorMessage({message: error.responseText});
            $("#edit-category .message").html(rendered);

        }).complete(function() {
            // enable add button
            $("#edit-category button").prop('disabled', false);
        });
    }

    // remove a category
    category.remove = function() {
        var invalidFields = checkForm($("#remove-category form")[0]);

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

            $("#remove-category .message").html(rendered);
            return;
        }

        // disable add button
        $("#remove-category button").prop('disabled', true);

        $.ajax({
            type: "POST",
            url: "/admin/api/cat/" + parseInt($("#remove-category-id").val()) + "/delete",
            dataType: "json",
        }).done(function(response) {
            // refesh all selects in page
            category.refreshSelect();

            // compile "success-message-tpl" if needed
            if( typeof compiledTemplate.successMessage == "undefined" ) {
                compiledTemplate.successMessage = Handlebars.compile($("#success-message-tpl").html());
            }

            // show success message
            var rendered = compiledTemplate.successMessage({message: "Success! Category removed."});
            $("#remove-category .message").html(rendered);

        }).error(function(error) {
            // compile "error-message-tpl" if needed
            if( typeof compiledTemplate.errorMessage == "undefined" ) {
                compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
            }

            // show error message
            var rendered = compiledTemplate.errorMessage({message: error.responseText});
            $("#remove-category .message").html(rendered);

        }).complete(function() {
            // enable add button
            $("#remove-category button").prop('disabled', false);
        });
    }

    // private function: check form validity
    var checkForm = function(form) {
        var invalidFieldName = [];

        $.each($(form).find("input, select"), function(k, v) {
            $(v).parent().removeClass("has-error");

            if( !v.checkValidity() ) {
                invalidFieldName.push($("label[for=" + $(v).attr("id") + "]").text());
                $(v).parent().addClass("has-error");
            }
        });

        return invalidFieldName;
    }
})();

$(function() {
    category.init();
});