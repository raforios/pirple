/**
 * 
 * API REST SERVER
 * 
 */

// Dependencies
let http = require( 'http' );
let https = require( 'https' );
let url =  require( 'url' );
let fs = require( 'fs' );
let path = require( 'path' );
let StringDecoder = require( 'string_decoder' ).StringDecoder;
let config = require( './config' );
let helpers = require( './helpers' );
let handlers = require( './handlers' );
let router = require( './router' );
let util = require( 'util' );
let debug = util.debuglog( 'server' );

// Container for the module (to be exported)
let server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer( ( req, res ) => {
    server.unifiedServer( req, res );

});

// Instantiate the HTTPS server
server.httpsServerOptions = {
    key : fs.readFileSync( path.join(__dirname, '/../https/key.pem' ) ),
    cert : fs.readFileSync( path.join(__dirname, '/../https/cert.pem' ) )
};
server.httpsServer = https.createServer( server.httpsServerOptions, ( req, res ) => {
    server.unifiedServer( req, res );

});

// All the server logic for both the http and https server
server.unifiedServer = ( req, res ) => {
    // Get the URL and parse it
    let parsedUrl = url.parse( req.url, true );

    // Get the path
    let path = parsedUrl.pathname;
    let trimedPath = path.replace( /^\/+|\/+$/g, '' );

    // Get the query string as an object
    let queryStringObject = parsedUrl.query;

    // Get HTTP method
    let method = req.method.toLowerCase();

    // Get the headers as an object
    let headers = req.headers;

    // Get the payload
    let decoder = new StringDecoder( 'utf-8' );
    let buffer = '';
    req.on( 'data', ( ( data ) => {
        buffer += decoder.write( data );
    }));
    req.on( 'end', ( () => {
        buffer += decoder.end();

        // Chose the handler this request should go to
        let chosenHandler = typeof( router[trimedPath] ) !== 'undefined' ? router[trimedPath] : handlers.notFound;

        // Construct the data objectto send to the handler
        let data = {
            'trimedPath' : trimedPath,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : helpers.parseJsonToObject(buffer)
        };

        // Route the request to the handler specifiedin the router
        chosenHandler( data, ( statusCode, payload ) => {
            // Use the status code called back by the handler or default to 200
            statusCode = typeof( statusCode ) === 'number' ? statusCode : 200;

            // Use de payload called back by the handler or defalut to an empty object
            payload = typeof( payload ) === 'object' ? payload : {};

            // Convert the payload to a string
            let payloadString = JSON.stringify( payload );

            // Return the response
            res.setHeader( 'Content-Type' , 'application/json' );
            res.writeHead( statusCode );
            // res.end( pages.pageHead + ' <h2><em> ' + statusCode + ' </em> ' + payloadString + ' </h2>');
            res.end( payloadString );

            // If the response is 200 print cyan otherwise print red
            if ( statusCode === 200 || statusCode ===201 ) {
                debug( '\x1b[36m%s\x1b[0m', method.toUpperCase() + '/' + trimedPath + ' ' + statusCode );
            } else {
                debug( '\x1b[31m%s\x1b[0m', method.toUpperCase() + '/' + trimedPath + ' ' + statusCode );
            }
        });
    }));
};

// Init script
server.init = ( ) => {
    // Start the HTTP server
    server.httpServer.listen( config.httpPort, ( () => {
        console.log( '\x1b[33m%s\x1b[0m', 'The server is listening on port: '+ config.httpPort );
    }));

    // Start the HTTPS server
    server.httpsServer.listen( config.httpsPort, ( () => {
        console.log( '\x1b[34m%s\x1b[0m', 'The server is listening on port: '+ config.httpsPort );
    }));
};

// Export the module
module.exports = server;
