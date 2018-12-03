/**
 * 
 * Admin Handlers
 * 
 */

// Dependencies
let users = require( '../handlers/userHandlers' );
let tokens = require( '../handlers/tokenHandlers' );
let checks = require( '../handlers/checksHandlers' );
let menu = require( '../handlers/menuHandlers' );
let orders = require( '../handlers/orderHandlers' );
let payment = require( '../handlers/paymentHandlers' );
let util = require( 'util' );
let debug = util.debuglog( 'workers' );

// Define the handlers
let handlers = {};

// Obtain handler acceptable methods for a given handler module
let obtainHandler = ( moduleHandler, acceptableMethods ) => {
    return( ( data, callback ) => {
        if ( acceptableMethods.indexOf( data.method ) > -1 ) {
            moduleHandler[ data.method ]( data, callback );
        } else {
            callback ( 405 );
        }    
    });
};

// Users
handlers.users = obtainHandler( users, [ 'post', 'get', 'put', 'delete' ] );

// Tokens
handlers.tokens = obtainHandler( tokens, [ 'post', 'get', 'put', 'delete' ] );

// Checks
handlers.checks = obtainHandler( checks, [ 'post', 'get', 'put', 'delete' ] );

// Menu
handlers.menu = obtainHandler( menu, [ 'get' ] );

// Orders
handlers.orders = obtainHandler( orders, [ 'post', 'get', 'put', 'delete' ] );

// Payment
handlers.payment = obtainHandler( payment, [ 'get' ] );

// Ping handler
handlers.ping = ( data, callback ) => {
    callback( 200 );
};

// Not found handler
handlers.notFound = ( data, callback ) => { 
    callback( 404 );

};

// Export the module
module.exports = handlers;

