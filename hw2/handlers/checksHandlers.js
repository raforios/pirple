/**
 * 
 * Checks Handlers
 * 
 */

// Dependencies
let _data = require( '../lib/data' );
let helpers = require( '../lib/helpers' );
let config = require( '../lib/config' );
let tokens = require( './tokenHandlers' );

// Container for the module (to be exported)
let lib = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: None
lib.post = ( ( data, callback ) => {
    // Validate inputs
    let protocol = typeof( data.payload.protocol ) === 'string' && [ 'http', 'https' ].indexOf( data.payload.protocol ) > -1 ? data.payload.protocol : false;
    let url = typeof( data.payload.url ) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    let method = typeof( data.payload.method ) === 'string' && [ 'post', 'get', 'put', 'delete' ].indexOf( data.payload.method ) > -1 ? data.payload.method : false;
    let successCodes = typeof( data.payload.successCodes ) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof( data.payload.timeoutSeconds ) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if ( protocol && url && method && successCodes && timeoutSeconds ) {
        // Get the token from the headers
        let token = typeof( data.headers.token ) === 'string' ? data.headers.token : false;
        
        // Lookup the user by reading the token
        _data.read( 'tokens', token, ( ( err, tokenData ) => {
            if ( !err && tokenData ) {
                let userPhone = tokenData.phone;

                // Lookup the user data
                _data.read( 'users', userPhone, ( ( err, userData ) => {
                    if ( !err && userData ) {
                        let userChecks = typeof( userData.checks ) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // Verify that the user has less than the number of max-checks-per-user
                        if ( userChecks.length < config.maxChecks ) {
                            // Create a random id for the check
                            let checkId = helpers.createRandomString( 20 );

                            // Create the check object, and include the user's phone
                            let checkObject = {
                                id : checkId,
                                userPhone : userPhone,
                                protocol : protocol,
                                url : url,
                                method : method,
                                successCodes : successCodes,
                                timeoutSeconds : timeoutSeconds
                            };

                            // Save the object
                            _data.create( 'checks', checkId, checkObject, ( ( err ) => {
                                if ( !err ) {
                                    // Add the check id to the user's object
                                    userData.checks = userChecks;
                                    userData.checks.push( checkId );

                                    // Save the new user data
                                    _data.update( 'users', userPhone, userData, ( ( err ) => {
                                        if ( !err ) {
                                            // Return the data about the new check
                                            callback( 200, checkObject );
                                        } else {
                                            callback( 500, { Error : 'Could not update the user with the new check' } );
                                        }
                                    }));
                                } else {
                                    callback( 500, { Error : 'Could not create the new check' } );
                                }
                            }));
                        } else {
                            callback( 400, { Error : 'The user already has the maximun number of checks (' + config.maxChecks + ')' } );
                        }
                    } else {
                        callback( 403 );
                    }
                }));
            } else {
                callback( 403 );
            }
        }));
    } else {
        callback( 400, { Error : 'Missing required inputs, or inputs are invalid' } );
    }
});

// Checks - get
// Required data: id
// Optional data: None
lib.get = ( ( data, callback ) => {
    // Check that the id is valid
    let id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
    if ( id ) {

        // Lookup the check
        _data.read( 'checks', id, ( ( err, checkData ) => {
            if ( !err && checkData ) {

                // Get the token from the headers
                let token = typeof( data.headers.token ) === 'string' ? data.headers.token : false;
                // Verify that the given token is valid and belongs the the user who created the check
                tokens.verifyToken( token, checkData.userPhone, ( ( tokenIsValid ) => {
                    if ( tokenIsValid ) {
                        // Return the check data
                        callback( 200, checkData );
                    } else {
                        callback( 403 );
                    }
                }));
            } else {
                callback( 404 );
            }
        }));
    } else {
        callback( 400, { Error : 'Missing required field' } );
    }
});

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (at least one must be specified)
lib.put = ( ( data, callback ) => {
    // Check for the required field
    let id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;

    // Check for the optional fields
    let protocol = typeof( data.payload.protocol ) === 'string' && [ 'http', 'https' ].indexOf( data.payload.protocol ) > -1 ? data.payload.protocol : false;
    let url = typeof( data.payload.url ) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    let method = typeof( data.payload.method ) === 'string' && [ 'post', 'get', 'put', 'delete' ].indexOf( data.payload.method ) > -1 ? data.payload.method : false;
    let successCodes = typeof( data.payload.successCodes ) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof( data.payload.timeoutSeconds ) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    // Check to make sure id is valid
    if ( id ) {
        // Check to make sure one or more optional field has been sent
        if ( protocol || url || method || successCodes || timeoutSeconds ) {

            // Lookup the check
            _data.read( 'checks', id, ( ( err, checkData ) => {
                if ( !err && checkData ) {

                    // Get the token from the headers
                    let token = typeof( data.headers.token ) === 'string' ? data.headers.token : false;
                    // Verify that the given token is valid and belongs the the user who created the check
                    tokens.verifyToken( token, checkData.userPhone, ( ( tokenIsValid ) => {
                        if ( tokenIsValid ) {
                            // Update the fields necessary
                            if ( protocol ) {
                                checkData.protocol = protocol;
                            }
                            if ( url ) {
                                checkData.url = url;
                            }
                            if ( method ) {
                                checkData.method = method;
                            }
                            if ( successCodes ) {
                                checkData.successCodes = successCodes;
                            }
                            if ( timeoutSeconds ) {
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            // Store the new updates
                            _data.update( 'checks', id, checkData, ( ( err ) => {
                                if ( !err ) {
                                    callback( 200 );
                                } else {
                                    callback ( 500, { Error : 'Could not update the check' } );
                                }
                            }));
                        } else {
                            callback( 403 );
                        }
                    }));                    
                } else {
                    callback( 400, { Error : 'Check id did not exist' } );
                }
            }));    
        } else {
            callback( 400, { Error : 'Missing fields to update' } );
        }
    } else {
        callback( 400, { Error : 'Missing required field' } );
    }
});

// Checks - delete
// Required data: id
// Optional data: None
lib.delete = ( ( data, callback ) => {
    // Check that the id is valid
    let id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
    if ( id ) {

        // Lookup the check
        _data.read( 'checks', id, ( ( err, checkData ) => {
            if ( !err && checkData ) {
                // Get the token from the headers
                let token = typeof( data.headers.token ) === 'string' ? data.headers.token : false;
                // Verify that the given token is valid for the phone number
                _tokens.verifyToken( token, checkData.userPhone, ( ( tokenIsValid ) => {
                    if ( tokenIsValid ) {

                        // Delete the check data
                        _data.delete( 'checks', id, ( ( err ) => {
                            if ( !err ) {
                            // Lookup the user
                            _data.read( 'users', checkData.userPhone, ( ( err, userData ) => {
                                if ( !err && userData ) {
                                    let userChecks = typeof( userData.checks ) === 'object' && userData.checks instanceof Array ? userData.checks : [];

                                    // Remove the delete check from their list of checks
                                    let checkPosition = userChecks.indexOf( id );
                                    if ( checkPosition > -1 ) {
                                        userChecks.splice( checkPosition, 1 );
                                        //Re-save the user's data
                                        _data.update( 'users', checkData.userPhone, userData, ( ( err ) => {
                                            if ( !err ) {
                                                callback( 200 );
                                            } else {
                                                callback( 500, { Error : 'Could not update the user' } );
                                            }
                                        }));    
                                    } else {
                                        callback( 500, { Error : 'Could not find the check on the users object, so could not remove it' } );
                                    }
                                } else {
                                    callback( 500, { Error : 'Could not find the user who created the check, so could not remove the check from the list of checks on the user object ' } );
                                }
                            }));
                            } else {
                                callback( 500, { Error : 'Could not delete the specified check' } );
                            }
                        }));
                    } else {
                        callback( 403 );
                    }
                }));
            } else {
                callback( 400, { Error : 'Could not find the specified check' } );
            }
        }));
    } else {
        callback( 400, { Error : 'Missing required field' } );
    }
});

// Export the module
module.exports = lib;

