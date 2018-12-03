/**
 * 
 * Tokens Handlers
 * 
 */

// Dependencies
let _data = require( '../lib/data' );
let helpers = require( '../lib/helpers' );
let token = require( '../models/tokenModel' );
// Container for the module (to be exported)
let lib = {};

// Tokens - post
// Required data: phone, password
// Optional data: None
lib.post = ( data, callback ) => {
    // Check that all required fields are filled out
    token.phone = typeof( data.payload.phone ) === 'string' && data.payload.phone.trim().length === 8 ? data.payload.phone.trim() : false;
    let password = typeof( data.payload.password ) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if ( token.phone && password ) {
        // Lookup the user who matches that phone number
        _data.read( 'users', token.phone, ( ( err, userData ) => {
            if ( !err && userData ) {
                // Has the sent password and compare it to the password stored in the user object
                let hashedPassword = helpers.hash( password );
                if ( hashedPassword === userData.hashedPassword ) {
                    // If valid, create a new token with random name. Set expiration date 1 hour in the future
                    token.id = helpers.createRandomString( 20 );
                    token.expires = Date.now() + 1000 * 60 * 60;

                    // Store the token
                    _data.create( 'tokens', token.id, token, ( ( err ) => {
                        if ( !err ) {
                            callback( 200, token );
                        } else {
                            callback( 500, { Error : 'Could not create the new token' } );
                        }
                    }));

                } else {
                    callback ( 400, { Error : 'Password did not match the specified user\'s stored password' } );
                }
            } else {
                callback ( 400, { Error : 'Could not find the specified user' } );
            }
        }));
    } else {
        callback( 400, { Error : 'Missing required fields' } );
    }
};

// Tokens - get
// Required data: id
// Optional data: None
lib.get = ( data, callback ) => {
    // Check that the id is valid
    token.id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
    if ( token.id ) {
        // Lookup the token
        _data.read( 'tokens', token.id, ( ( err, tokenData ) => {
            if ( !err && tokenData ) {
                callback( 200, tokenData );
            } else {
                callback( 404 );
            }
        }));
    } else {
        callback( 400, { Error : 'Missing required field' } );
    }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
lib.put = ( data, callback ) => {
    // Check for the required field
    token.id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
    let extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false;
    if ( token.id && extend ) {
        // Lookup the token
        _data.read( 'tokens', token.id, ( ( err, tokenData ) => {
            if ( !err && tokenData ) {
                // Check to the make sure the token isn't already expired
                if ( tokenData.expires > Date.now() ) {
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    // Store the new updates
                    _data.update( 'tokens', token.id, tokenData, ( ( err ) => {
                        if ( !err ) {
                            callback( 200 );
                        } else {
                            callback ( 500, { Error : 'Could not update the token\'s expiration' } );
                        }
                    }));
                } else {
                    callback( 400, { Error : 'The token has already expired, and can not be extended' } );
                }
            } else {
                callback( 400, { Error : 'The specified token does not exist' } );
            }
        }));    
    } else {
        callback( 400, { Error : 'Missing required field(s) or field(s) are invalid' } );
    }
};

// Tokens - delete
// Required data: id
// Optional data: None
lib.delete = ( data, callback ) => {
    // Check that the id is valid
    token.id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
    if ( token.id ) {
        // Lookup the token
        _data.read( 'tokens', token.id, ( ( err, data ) => {
            if ( !err && data ) {
                _data.delete( 'tokens', token.id, ( ( err ) => {
                    if ( !err ) {
                        callback( 200 );
                    } else {
                        callback( 500, { Error : 'Could not delete the specified token' } );
                    }
                }));
            } else {
                callback( 400, { Error : 'Could not find the specified token' } );
            }
        }));
    } else {
        callback( 400, { Error : 'Missing required field' } );
    }
};

// Verify if a given token id is currently valid for a given user
lib.verifyToken = ( id, phone, callback ) => {
    // Lookup the token
    _data.read( 'tokens', id, ( ( err, tokenData ) => {
        if ( !err && tokenData ) {
            // Check that the token is  for the given user and has not expired
            if ( tokenData.phone === phone && tokenData.expires > Date.now() ) {
                callback( true );
            } else {
                callback( false );
            }
        } else {
            callback( false );
        }
    }));
};

// Export the module
module.exports = lib;

