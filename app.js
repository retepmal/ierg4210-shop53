var express = require('express'),
    exphbs  = require('express-handlebars');

var app = express();

// serve static files
app.use('/images', express.static(__dirname + '/images'));
app.use('/lib', express.static(__dirname + '/javascripts'));
app.use('/css', express.static(__dirname + '/stylesheets'));
app.use('/fonts', express.static(__dirname + '/fonts'));

// set express-handlebars
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// serve dynamic pages
app.get('/', function (req, res) {
    res.render('index');
});
app.get('/product/:id', function (req, res) {
    res.render('product' + req.params.id);
});
app.get('/catalog/:name', function (req, res) {
    // show index page now, to be finished later
    res.render('index');
});

// start listening on port 3000
app.listen(process.env.PORT || 3000, function () {
    console.log('listening on: ' + (process.env.PORT || 3000));
});
