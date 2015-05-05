(function(){
    var signin = window.signin = {};

    var uri = new URI();
    var compiledTemplate = {};
    signin.init = function() {
        // bind click event for signin button
        $("#signin-panel button").click(function() { signin.submit(); });

        // show dialog if fragment appears in URL
        var state = uri.fragment();

        if( state.length > 0 ) {
            var tpl, msg;

            switch(state) {
                case 'invalid_activation':
                    tpl = "#error-message-tpl";
                    msg = "Invalid activation link.";
                    break;
                case 'account_activated':
                    tpl = "#success-message-tpl";
                    msg = "Account activated! Please sign-in to continue.";
                    break;
                case 'password_changed':
                    tpl = "#success-message-tpl";
                    msg = "Password changed. Please sign-in again.";
                    break;
                case 'account_created':
                    tpl = "#success-message-tpl";
                    msg = "Account created. Please complete the steps in confirmation email.";
                    break;
            }

            if( typeof compiledTemplate[tpl] == "undefined" ) {
                compiledTemplate[tpl] = Handlebars.compile($(tpl).html());
            }

            var rendered = compiledTemplate[tpl]({message: msg});
            $(".signin-message").html(rendered);
        }
    };

    signin.submit = function() {
        var invalidFields = checkForm($("#signin-panel form")[0]);

        // show error if there is any invalid fields
        if( invalidFields.length > 0 ) {
            signin.changePanel("panel-danger", "Please input your credential.");
            return;
        }

        var email = $("#signin-panel input#email").val();
        var password = $("#signin-panel input#password").val();

        $.ajax({
            type: "POST",
            url: "/account/api/login",
            data: $("#signin-panel form").serialize(),
            beforeSend: function() {
                // disable all inputs and buttons
                $("#signin-panel button, #signin-panel input").prop('disabled', true);
            },
        }).done(function(response) {
            signin.changePanel("panel-success", "Success!");

            switch( uri.filename() ) {
                case "checkout":
                    // redirect to checkout page
                    location.href = "/checkout";
                    break;

                default:
                    // redirect to account default page
                    location.href = "/account";
                    break;
            }

        }).error(function(xhr) {
            switch( xhr.status ) {
                case 401:
                    signin.changePanel("panel-danger", "Your email or password is incorrect. Please re-try.");
                    break;

                case 412:
                    signin.changePanel("panel-danger", "Please activate your account through the link in email.");
                    break;

                case 403:
                default:
                    signin.changePanel("panel-danger", "Please refresh this page and re-try.");
                    break;
            }

            // enable the form
            $("#signin-panel button, #signin-panel input").prop('disabled', false);
        });
    };

    // change panel to other color and panel heading
    signin.changePanel = function(type, msg) {
        var re = /(panel-[\w]+)/g;
        var original = $("#signin-panel").attr("class");

        $("#signin-panel").attr("class", original.replace(re, '') + type);
        $("#signin-panel .panel-title").text(msg);
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

$(function() {
    signin.init();
});