(function(){
    var category = window.category = {};

    var categoryListIds = ['#edit-category-id', '#remove-category-id'];
    category.init = function() {
        // bind click event for category page buttons
        $("#add-category form button").click(function() { category.add(); });
        $("#edit-category form button").click(function() { category.edit(); });
        $("#edit-category form select").change(function() { category.selectForEdit(); });
        $("#remove-category form button").click(function() { category.remove(); });

        // init page with obtaining category list
        category.refreshSelect();
    };

    // refresh category list (select options) for all select in categoryListIds
    category.refreshSelect = function() {
        $.ajax({
            type: "GET",
            url: "/admin/api/cat/list",
            dataType: "json",
        }).done(function(response) {
            // render category list
            var template = $('#category-list-tpl').html();
            var rendered = Mustache.render(template, {categories: response});
                
            // apply to all selects
            $.each(categoryListIds, function(k, v) {
                $(v).html(rendered);
            });

        }).error(function(error) {
            // incorrect response
            var template = $('#error-message-tpl').html();
            var rendered = Mustache.render(template, {message: response.message});

            $("#add-category .message").html(rendered);
        });
    };

    // add a category
    category.add = function() {
        var invalidFields = checkForm($("#add-category form")[0]);

        // show error if there is any invalid fields
        if( invalidFields.length > 0 ) {
            var template = $('#warn-invalid-form-tpl').html();
            var message = Mustache.render(template, {fields: invalidFields});

            var template = $('#error-message-tpl').html();
            var rendered = Mustache.render(template, {message: message});

            $("#add-category .message").html(rendered);
            return;
        }

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

            // show success message
            var template = $('#success-message-tpl').html();
            var rendered = Mustache.render(template, {message: "Success! Category added."});

            $("#add-category .message").html(rendered);

        }).error(function(error) {
            // show error message
            var template = $('#error-message-tpl').html();
            var rendered = Mustache.render(template, {message: error.responseJSON.message});

            $("#add-category .message").html(rendered);

        });
    };

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
    };

    // edit a category
    category.edit = function() {
        var invalidFields = checkForm($("#edit-category form")[0]);

        // show error if there is any invalid fields
        if( invalidFields.length > 0 ) {
            var template = $('#warn-invalid-form-tpl').html();
            var message = Mustache.render(template, {fields: invalidFields});

            var template = $('#error-message-tpl').html();
            var rendered = Mustache.render(template, {message: message});

            $("#edit-category .message").html(rendered);
            return;
        }

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

            // show success message
            var template = $('#success-message-tpl').html();
            var rendered = Mustache.render(template, {message: "Success! Category edited."});

            $("#edit-category .message").html(rendered);

        }).error(function(error) {
            // show error message
            var template = $('#error-message-tpl').html();
            var rendered = Mustache.render(template, {message: error.responseJSON.message});

            $("#edit-category .message").html(rendered);
        });

    };

    // remove a category
    category.remove = function() {
        var invalidFields = checkForm($("#remove-category form")[0]);

        // show error if there is any invalid fields
        if( invalidFields.length > 0 ) {
            var template = $('#warn-invalid-form-tpl').html();
            var message = Mustache.render(template, {fields: invalidFields});

            var template = $('#error-message-tpl').html();
            var rendered = Mustache.render(template, {message: message});

            $("#remove-category .message").html(rendered);
            return;
        }

        $.ajax({
            type: "POST",
            url: "/admin/api/cat/" + parseInt($("#remove-category-id").val()) + "/delete",
            dataType: "json",
        }).done(function(response) {
            // refesh all selects in page
            category.refreshSelect();

            // show success message
            var template = $('#success-message-tpl').html();
            var rendered = Mustache.render(template, {message: "Success! Category removed."});

            $("#remove-category .message").html(rendered);

        }).error(function(error) {
            // show error message
            var template = $('#error-message-tpl').html();
            var rendered = Mustache.render(template, {message: error.responseJSON.message});

            $("#remove-category .message").html(rendered);
        });
    };

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
    };
})();

category.init();