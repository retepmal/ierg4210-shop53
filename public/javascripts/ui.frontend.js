(function(){
    var frontend = window.frontend = {};

    var uri = new URI();
    var host = uri.host();
    var compiledTemplate = {};
    var categoryList = {};
    frontend.init = function() {
        loadCategoryList();
        frontend.loadPage(location.href);

        // create the history entry when first load the page
        history.replaceState({ path: window.location.href }, '');

        // handle the back and forward buttons
        $(window).bind('popstate', function(event) {
            var state = event.originalEvent.state;
            if( state ) {
                frontend.loadPage(state.path);
            }
        });

        // handle click on store title
        $("#store-title").click(function() {
            frontend.loadPage("/");
        });
    }

    // first determine whether the link matches pattern,
    // then render page with AJAX request + history.pushState()
    frontend.loadPage = function(url) {
        var init = ( typeof init == "undefined" ) ? false : init;
        var matched = false;
        var uri = new URI(url);
        var path = uri.path();

        // list of regex patterns
        var defaultPage = /^\/$/;
        var categoryPage = /^\/(\d+)(?:|\/page\/(\d+))(?:|\/)$/;
        var productPage = /^\/(\d+)\/(\d+)(?:|\/)$/;

        if( uri.host() == host || uri.host() == "" ) {
            if( defaultPage.test(path) ) {
                matched = true;
                loadCategory(0, 1);
            }

            if( categoryPage.test(path) ) {
                matched = true;
                param = categoryPage.exec(path);

                loadCategory(param[1], ((typeof param[2] == 'undefined') ? 1: param[2]));
            }

            if( productPage.test(path) ) {
                matched = true;
                param = productPage.exec(path);

                loadProduct(param[2]);
            }
        }

        return matched;
    }

    // parse anchor link if it can be loaded via AJAX request
    // otherwise redirect user using location.href
    frontend.clickLink = function(anchor) {
        var targetUrl = $(anchor).attr("href");

        if( frontend.loadPage(targetUrl) ) {
            history.pushState({ path: targetUrl }, "", targetUrl);
        } else {
            location.href = targetUrl;
        }
    }

    // show products in specific category
    var loadCategory = function(catid, currentPage) {
        catid = parseInt(catid);
        currentPage = parseInt(currentPage);

        $.ajax({
            type: "GET",
            url: "/api/category/" + catid + "/" + currentPage,
            dataType: "json",
        }).done(function(response) {
            var tplVars = {
                catid: catid,
                pages: [],
            };

            // compile "product-list-tpl" if needed
            if( typeof compiledTemplate.productList == "undefined" ) {
                compiledTemplate.productList = Handlebars.compile($("#product-list-tpl").html());
            }

            // update active category in left side list
            $("ul#category-list li").removeClass("active");
            $("ul#category-list li[data-catid=" + parseInt(catid) + "]").addClass("active");

            // prepare pagination variables
            tplVars.isFirstPage = ( currentPage == 1 );
            tplVars.isLastPage = ( response.pages == currentPage || response.pages == 0 );
            tplVars.prevPage = currentPage - 1;
            tplVars.nextPage = currentPage + 1;

            for( var i = 1; i <= response.pages; i++ ) {
                tplVars.pages.push({
                    page: i,
                    catid: catid,
                    current: (i == currentPage),
                });
            }

            // prepare navigation menu variables
            tplVars.isInCategory = ( catid > 0 );
            tplVars.categoryName = ( catid > 0 ) ? categoryList[catid] : '';

            // process product list
            tplVars.isEmptyCategory = ( response.data.length == 0 );
            tplVars.products = response.data;

            // render product list and show in content section
            $("#page-content").html(
                compiledTemplate.productList(tplVars)
            );
            $("#page-content a.xhr-enable").click(function(event) {
                event.preventDefault();
                frontend.clickLink(this);
            });
            $("#page-content button[name=addToCart]").click(function() {
                cart.add($(this).attr("data-pid"));
            });

        }).error(function(error) {
            showError(error.responseText);
        });
    }

    // show products information
    var loadProduct = function(pid) {
        pid = parseInt(pid);

        $.ajax({
            type: "GET",
            url: "/api/product/" + pid,
            dataType: "json",
        }).done(function(response) {
            // compile "product-detail-tpl" if needed
            if( typeof compiledTemplate.productDetail == "undefined" ) {
                compiledTemplate.productDetail = Handlebars.compile($("#product-detail-tpl").html());
            }

            var tplVars = {
                catid: response.catid,
                categoryName: categoryList[response.catid],
                productId: pid,
                productName: response.name,
                productImage: response.image,
                productPrice: response.price,
                productDescription: response.description,
            };

            // render product list and show in content section
            $("#page-content").html(
                compiledTemplate.productDetail(tplVars)
            );
            $("#page-content a.xhr-enable").click(function(event) {
                event.preventDefault();
                frontend.clickLink(this);
            });
            $("#page-content button[name=addToCart]").click(function() {
                cart.add($(this).attr("data-pid"));
            });

        }).error(function(error) {
            showError(error.responseText);
        });
    }

    // update category list on left side section
    var loadCategoryList = function() {
        $.ajax({
            type: "GET",
            url: "/api/categories",
            dataType: "json",
            async: false,
        }).done(function(response) {
            // compile "category-list-tpl" if needed
            if( typeof compiledTemplate.categoryList == "undefined" ) {
                compiledTemplate.categoryList = Handlebars.compile($("#category-list-tpl").html());
            }

            // cache category list for other usages
            $.each(response, function(k, v) {
                categoryList[v.catid] = v.name;
            });

            // render category list and show in content section
            $("#page-left").html(
                compiledTemplate.categoryList({
                    categories: response
                })
            );
            $("#page-left a.xhr-enable").click(function(event) {
                event.preventDefault();
                frontend.clickLink(this);
            });

        }).error(function(error) {
            showError(error.responseText);
        });
    }

    // render error message and show in content section
    var showError = function(msg) {
        if( typeof compiledTemplate.errorMessage == "undefined" ) {
            compiledTemplate.errorMessage = Handlebars.compile($("#error-message-tpl").html());
        }

        $("#page-content").html(
            compiledTemplate.errorMessage({
                message: msg
            })
        );
    }
})();

$(function() {
    frontend.init();
});