var express = require('express');

module.exports = function(pool) {
    var app = express.Router();

    /*
     * The following code mainly references to official demo:
     * https://github.com/emotionLoop/visualCaptcha-node
     */

    app.get('/start/:howmany', function(req, res, next) {
        var visualCaptcha;

        // Initialize visualCaptcha
        visualCaptcha = require( 'visualcaptcha' )( req.session, req.query.namespace );

        visualCaptcha.generate( req.params.howmany );

        // We have to send the frontend data to use on POST.
        res.status( 200 ).send( visualCaptcha.getFrontendData() );
    });

    app.get('/image/:index', function(req, res, next) {
        var visualCaptcha,
            isRetina = false;

        // Initialize visualCaptcha
        visualCaptcha = require( 'visualcaptcha' )( req.session, req.query.namespace );

        // Default is non-retina
        if ( req.query.retina ) {
            isRetina = true;
        }

        visualCaptcha.streamImage( req.params.index, res, isRetina );
    });

    var _getAudio = function(req, res, next) {
        var visualCaptcha;

        // Default file type is mp3, but we need to support ogg as well
        if ( req.params.type !== 'ogg' ) {
            req.params.type = 'mp3';
        }

        // Initialize visualCaptcha
        visualCaptcha = require( 'visualcaptcha' )( req.session, req.query.namespace );

        visualCaptcha.streamAudio( res, req.params.type );
    };

    app.get('/audio', _getAudio);
    app.get('/audio/:type', _getAudio);

    return app;
};
