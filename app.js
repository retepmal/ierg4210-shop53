var express = require('express'),
    exphbs  = require('express-handlebars'),

    frontEndRouter   = require(__dirname + '/routes/frontend.js'),
    backEndRouter    = require(__dirname + '/routes/backend.js'),
    backEndAPIRouter = require(__dirname + '/routes/backend.api.js');

var app = express();

// set express-handlebars
app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    helpers: {
        equal: require("handlebars-helper-equal"),
    },
}));
app.set('view engine', 'handlebars');

// serve static files
app.use('/images', express.static(__dirname + '/public/images'));
app.use('/lib', express.static(__dirname + '/public/javascripts'));
app.use('/css', express.static(__dirname + '/public/stylesheets'));
app.use('/fonts', express.static(__dirname + '/public/fonts'));

// include frontend and backend routers
app.use('/', frontEndRouter);
app.use('/admin', backEndRouter);
app.use('/admin/api', backEndAPIRouter);

// start listening on port 3000
app.listen(process.env.PORT || 3000, function () {
    console.log('listening on: ' + (process.env.PORT || 3000));
});
