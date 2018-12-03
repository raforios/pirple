/**
 * 
 * Users handlers
 * 
 */

// Dependencies
let _data = require( '../lib/data' );
let helpers = require( '../lib/helpers' );
let tokens = require( './tokenHandlers' );
let userModel = require( '../models/userModel' );

// Container for the module (to be exported)
let lib = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: None
lib.post = ( data, callback ) => {
    // Check that all required fields are filled out
    userModel.firstName = typeof( data.payload.firstName ) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    userModel.lastName = typeof( data.payload.lastName ) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    userModel.phone = typeof( data.payload.phone ) === 'string' && data.payload.phone.trim().length === 8 ? data.payload.phone.trim() : false;
    userModel.email = typeof( data.payload.email ) === 'string' && helpers.validateEmail( data.payload.email.trim() ) === true ? data.payload.email.trim() : false;
    userModel.address = typeof( data.payload.address ) === 'string' && data.payload.address.trim().length >= 8 ? data.payload.address.trim() : false;
    let password = typeof( data.payload.password ) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if ( userModel.firstName && userModel.lastName && userModel.phone && password && userModel.email && userModel.address ) {
        // Make sure that the user doesnt already exist
        _data.read( 'users', userModel.phone, ( ( err, data ) => {
            if ( err ) {
                // Has the password
                userModel.hashedPassword = helpers.hash( password );

                if ( userModel.hashedPassword ) {    
                    // Store the user
                    _data.create('users', userModel.phone, userModel, ( ( err ) => {
                        if ( !err ) {
                            callback( 200 );
                        } else {
                            callback( 500, { Error : 'Could not create the new user' } );    
                        }
                    }));    
                } else {
                    callback ( 500, { Error : 'Could not hash the user\'s password' } );
                }
            } else {
                // User already exists
                callback ( 400, { Error : 'A user with that phone number already exists' } );
            }
        }));
    } else {
        callback( 400, { Error : 'Missing required fields' } );
    }
};

// Users - get
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
                // Lookup the user
                _data.read( 'users', userModel.phone, ( ( err, data ) => {
                    if ( !err && data ) {
                        // Remove the password from the user object before returning it the the request
                        delete data.hashedPassword;
                        callback( 200, data );
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

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
lib.put = ( data, callback ) => {
    // Check for the required field
    userModel.phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 8 ? data.payload.phone.trim() : false;

    // Check for the optional fields
    userModel.firstName = typeof( data.payload.firstName ) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    userModel.lastName = typeof( data.payload.lastName ) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    userModel.email = typeof( data.payload.email ) === 'string' && helpers.validateEmail( data.payload.email.trim() ) === true ? data.payload.email.trim() : false;
    userModel.address = typeof( data.payload.address ) === 'string' && data.payload.address.trim().length >= 8 ? data.payload.address.trim() : false;
    let password = typeof( data.payload.password ) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    // Error if the phone is invalid
    if ( userModel.phone ) {
        // Error if nothing is sent to update
        if ( userModel.firstName || userModel.lastName || userModel.email || userModel.address || password ) {

            // Get the token from the headers
            let token = typeof( data.headers.token ) === 'string' ? data.headers.token : false;
            // Verify that the given token is valid for the phone number
            tokens.verifyToken( token, userModel.phone, ( ( tokenIsValid ) => {
                if ( tokenIsValid ) {
                    // Lookup the user
                    _data.read( 'users', userModel.phone, ( ( err, userData ) => {
                        if ( !err && userData ) {
                            // Update the fields necessary
                            if ( userModel.firstName ) {
                                userData.firstName = userModel.firstName;
                            }
                            if ( userModel.lastName ) {
                                userData.lastName = userModel.lastName;
                            }
                            if ( userModel.email ) {
                                userData.email = userModel.email;
                            }
                            if ( userModel.address ) {
                                userData.address = userModel.address;
                            }
                            if ( password ) {
                                userData.hashedPassword = helpers.hash( password );
                            }
                            
                            // Store the new updates
                            _data.update( 'users', userModel.phone, userData, ( ( err ) => {
                                if ( !err ) {
                                    callback( 200 );
                                } else {
                                    callback ( 500, { Error : 'Could not update the user' } );
                                }
                            }));
                        } else {
                            callback( 400, { Error : 'The specified user does not exist' } );
                        }
                    }));    
                } else {
                    callback( 403, { Error : 'Missing required token in header or token is invalid' } );
                }
            }));            
        } else {
            callback( 400, { Error : 'Missing fields to update' } );
        }
    } else {
        callback( 400, { Error : 'Missing required field' } );
    }
};

// Users - delete
// Required data: phone
// Optional data: None
lib.delete = ( data, callback ) => {
    // Check that the phone number is valid
    userModel.phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 8 ? data.queryStringObject.phone.trim() : false;
    if ( userModel.phone ) {
        // Get the token from the headers
        let token = typeof( data.headers.token ) === 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        tokens.verifyToken( token, userModel.phone, ( ( tokenIsValid ) => {
            if ( tokenIsValid ) {
                // Lookup the user
                _data.read( 'users', userModel.phone, ( ( err, userData ) => {
                    if ( !err && userData ) {
                        _data.delete( 'users', userModel.phone, ( ( err ) => {
                            if ( !err ) {
                                // Delete each check of the checks associated with the user
                                let userChecks = typeof( userData.checks ) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                                let checksToDelete = userChecks.length;
                                if ( checksToDelete > 0 ) {
                                    let checksDeleted = 0;
                                    let deletionErrors = false;
                                    // Loop through the checks
                                    userChecks.forEach( ( checkId ) => {
                                        // Delete the check
                                        _data.delete( 'checks', checkId, ( ( err ) => {
                                            if ( err ) {
                                                deletionErrors = true;
                                            }
                                            checksDeleted++;
                                            if ( checksDeleted === checksToDelete ) {
                                                if ( !deletionErrors ) {
                                                    callback( 200 );
                                                } else {
                                                    callback( 500, { Error : 'Errors encountered while attempting to delete all of the user\'s checks. All checks may not have been deleted from the system successfully' } );
                                                }
                                            }
                                        }));        
                                    });
                                } else {
                                    callback( 200 );
                                }
                            } else {
                                callback( 500, { Error : 'Could not delete the specified user' } );
                            }
                        }));
                    } else {
                        callback( 400, { Error : 'Could not find the specified user' } );
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

