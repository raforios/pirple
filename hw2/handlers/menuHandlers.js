/**
 * 
 * Menu Handlers
 * 
 */

// Dependencies
let _data = require( '../lib/data' );
let tokens = require( './tokenHandlers' );
let userModel = require( '../models/userModel' );

// Container for the module (to be exported)
let lib = {};

// Menu - get
// Required data: phone
// Optional data: None
lib.get = ( data, callback ) => {
    // Check that the phone number is valid
    userModel.phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 8 ? data.queryStringObject.phone.trim() : false;

    if ( userModel.phone ) {

        // Get the token from the headers
        let token = typeof( data.headers.token ) === 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        tokens.verifyToken( token, userModel.phone, ( ( tokenIsValid ) => {
            if ( tokenIsValid ) {
                // Lookup the menu
                _data.read( 'menu', 'menu', ( ( err, menuData ) => {
                    if ( !err && menuData ) {
                        callback( 200, menuData );
                    } else {
                        callback( 404 );
                    }
                }));
            } else {
                callback( 403, { Error : 'Missing required token in header or token is invalid' } );
            }
        }));
    } else {
        callback( 400, { Error : 'Missing required field' } );
    }
};

// Export the module
module.exports = lib;

