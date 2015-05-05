(function(){
    var newpassword = window.newpassword = {};

    var compiledTemplate = {};
    newpassword.init = function() {
        // bind submit bottons event
        $("div#new-password-form button").click(function() { newpassword.submit(this); });
    }

    newpassword.submit = function(btn) {
        var form = $(btn).parents("form");
        if( !checkForm(form, "div#new-password-form .message", "new-password", "confirm-password") ) {
            return;
        }

        // disable submit button
        $("div#new-password-form button").prop('disabled', true);

        // request change password to server
        $.ajax({
            type: "POST",
            url: "/account/api/newpassword",
            data: form.serialize()
        }).done(function() {
            // redirect to front page
            location.href = "/account/login#password_changed";

        }).error(function(error) {
            // compile "error-message-tpl" if needed
            if( typeof compiledTemplate.errorMessage == "undefined" ) {
                compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
            }

            if( Array.isArray(error.responseJSON) && error.responseJSON.length > 0 ) {
                // compile "warn-invalid-form-tpl" if needed
                if( typeof compiledTemplate.warnInvalidForm == "undefined" ) {
                    compiledTemplate.warnInvalidForm = Handlebars.compile($("#warn-invalid-form-tpl").html());
                }

                var message = compiledTemplate.warnInvalidForm({fields: error.responseJSON});

            } else {
                var message = error.responseText;
            }

            var rendered = compiledTemplate.errorMessage({message: message});
            $("div#new-password-form .message").html(rendered);

            // enable submit button
            $("div#new-password-form button").prop('disabled', false);
        });
    }

    // private function: check form validity
    var checkForm = function(form, errorDiv, equalField1, equalField2) {
        $(errorDiv).text("");
        var invalidFields = [];
        var invalidRadio = [];

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

        // check two fields are equal or not
        if( typeof equalField1 != "undefined" && typeof equalField2 != "undefined" ) {
            var field1 = $("#"+equalField1);
            var field2 = $("#"+equalField2);

            if( field1.val() != field2.val() ) {
                field1.parent().addClass("has-error");
                field2.parent().addClass("has-error");
                invalidFields.push($("label[for=" + equalField1 + "]").text() + " not equal to " + $("label[for=" + equalField2 + "]").text());
            }
        }

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
            $(errorDiv).html(rendered);
            return false;
        } else {
            return true;
        }
    }
})();

$(function() {
    newpassword.init();
});
