/**
 * 
 * Orders Handlers
 * 
 */

// Dependencies
let _data = require( '../lib/data' );
let helpers = require( '../lib/helpers' );
let config = require( '../lib/config' );
let tokens = require( './tokenHandlers' );
let orderModel = require( '../models/orderModel' );
let userModel = require( '../models/userModel' );

// Container for the module (to be exported)
let lib = {};

// Orders - post
// Required data: content is an array with the menu id and the quantity
// Optional data: None
lib.post = ( data, callback ) => {
    // Validate inputs
    orderModel.content = typeof( data.payload.content ) === 'object' && data.payload.content instanceof Array && data.payload.content.length > 0 ? data.payload.content : false;
    if ( orderModel.content ) {

        // Get the token from the headers
        let token = typeof( data.headers.token ) === 'string' ? data.headers.token : false;
        
        // Lookup the user by reading the token
        _data.read( 'tokens', token, ( ( err, tokenData ) => {
            if ( !err && tokenData ) {
                let userPhone = tokenData.phone;

                // Lookup the user data
                _data.read( 'users', userPhone, ( ( err, userData ) => {
                    if ( !err && userData ) {
                        userModel.activeOrder = typeof( userData.activeOrder ) === 'object' && userData.activeOrder instanceof Array ? userData.activeOrder : [];

                        // Verify that the user has less than the number of max-orders-per-user
                        if ( userModel.activeOrder < config.maxChecks ) {

                            // Lookup the order data
                            _data.read( 'orders', 'orders', ( ( err, orderData ) => {
                                if ( !err && orderData ) {

                                    // Assign the orderData object to a new array for update the array
                                    let orderArray = orderData;                                
                                    if ( orderData.length > 0) {

                                        // Go through the entire object
                                        let lastOrder = 1;
                                        orderData.forEach( element => {

                                            // Verify if the order was created before
                                            if ( element.phone === userPhone ) {
                                                if ( element.status !== 'NEW' ) {
                                                    if ( orderData.length === lastOrder ) {

                                                        // Calling the AddOrder function for create a new order
                                                        lib.addOrder( orderModel, orderArray, userData, userPhone, userModel, callback );
                                                    } else {
                                                        lastOrder++;
                                                    }
                                                } else {
                                                    callback( 400, { Error : 'The user already has a order without finished' } );
                                                }
                                            } else {
                                                if ( orderData.length === lastOrder ) {
                                                    
                                                    // Calling the AddOrder function for create a new order
                                                    lib.addOrder( orderModel, orderArray, userData, userPhone, userModel, callback );
                                                } else {
                                                    lastOrder++;
                                                }
                                            }
                                        });
                                    } else {

                                        // Calling the AddOrder function for create a new order
                                        lib.addOrder( orderModel, orderArray, userData, userPhone, userModel, callback );
                                    }
                                } else {
                                    callback( 403 );
                                }
                            }));
                        } else {
                            callback( 400, { Error : 'The user already has the maximun number of orders (' + config.maxChecks + ')' } );
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
};

// Function (local) to create a new order for an existing user or new user
lib.addOrder = ( orderModel, orderArray, userData, userPhone, userModel, callback ) => {

    // Create a random id for the order
    let orderId = helpers.createRandomString( 20 );

    // Find the menu id of the new order, if it matches with some element in the menu object
    _data.read( 'menu', 'menu', ( ( err, menuData ) => {
        if ( !err && menuData ) {

            // Calculator the total of the order or update the total
            let total = 0;
            orderModel.content.forEach( item => {
                menuData.forEach( menuItem => {
                    if ( item.pizzaId === menuItem.pizzaId ) {
                        total = total + ( item.quantity * menuItem.price );
                    }                                                                    
                });
            });
            if ( total > 0 ) {

                // Prepare the order object, and include the menu items
                orderModel.orderId = orderId;
                orderModel.phone = userPhone;
                orderModel.status = 'NEW';
                orderModel.total = total;
                orderModel.dateOrder = new Date();
                orderArray.push( orderModel );

                // Save the object
                _data.update( 'orders', 'orders', orderArray, ( ( err ) => {
                    if ( !err ) {

                        // Add the order id to the user's object
                        userData.activeOrder = userModel.activeOrder;
                        userData.activeOrder.push( orderId );

                        // Save the new user data
                        _data.update( 'users', userPhone, userData, ( ( err ) => {
                            if ( !err ) {

                                // Return the data about the new order
                                callback( 200, orderModel );
                            } else {
                                callback( 500, { Error : 'Could not update the user with the new order' } );
                            }
                        }));
                    } else {
                        callback( 500, { Error : 'Could not create the new order' } );
                    }
                }));
            } else {
                callback( 400, { Error : 'Could not create the new order because not have valid menu items' } );
            }
        } else {
            callback ( 400, { Error : 'Could not find the menu object' } );
        }
    }));
};

// Orders - get
// Required data: orderId
// Optional data: None
lib.get = ( data, callback ) => {
    // Check that the id is valid
    orderModel.orderId = typeof(data.queryStringObject.orderId) === 'string' && data.queryStringObject.orderId.trim().length === 20 ? data.queryStringObject.orderId.trim() : false;
    if ( orderModel.orderId ) {

        // Lookup the order
        _data.read( 'orders', 'orders', ( ( err, orderData ) => {
            if ( !err && orderData ) {
                
                // Go through the entire object
                orderData.forEach( element => {

                    // Verify if the order was created before
                    if ( element.orderId === orderModel.orderId ) {

                        // Get the token from the headers
                        let token = typeof( data.headers.token ) === 'string' ? data.headers.token : false;

                        // Verify that the given token is valid and belongs the the user who created the order
                        tokens.verifyToken( token, element.phone, ( ( tokenIsValid ) => {
                            if ( tokenIsValid ) {

                                // Return the order data for a specific order Id 
                                let outputObject = {};
                                outputObject.orderId = element.orderId;
                                outputObject.phone = element.phone;
                                outputObject.status = element.status;
                                outputObject.total = element.total;
                                outputObject.dateOrder = element.dateOrder;
                                outputObject.content = element.content;
                                callback( 200, outputObject );
                            } else {
                                callback( 403 );
                            }
                        }));
                    }
                });
            } else {
                callback( 404 );
            }
        }));
    } else {
        callback( 400, { Error : 'Missing required field' } );
    }
};

// Orders - put
// Required data: orderId
// Optional data: content is an array with the menu id and the quantity
lib.put = ( data, callback ) => {
    // Check for the required field
    orderModel.orderId = typeof(data.payload.orderId) === 'string' && data.payload.orderId.trim().length === 20 ? data.payload.orderId.trim() : false;

    // Check for the optional fields
    orderModel.content = typeof( data.payload.content ) === 'object' && data.payload.content instanceof Array && data.payload.content.length > 0 ? data.payload.content : false;

    // Check to make sure id is valid
    if ( orderModel.orderId ) {

        // Check to make sure one or more optional field has been sent
        if ( orderModel.content.length > 0 ) {

            // Lookup the order data
            _data.read( 'orders', 'orders', ( ( err, orderData ) => {
                if ( !err && orderData ) {

                    // Assign the orderData object to a new array for update the array
                    let orderArray = orderData;

                    // Go through the entire object
                    orderData.forEach( element => {

                        // Verify if the order was created before
                        if ( element.orderId === orderModel.orderId ) {
                            if ( element.status === 'NEW' ) {

                                // Get the token from the headers
                                let token = typeof( data.headers.token ) === 'string' ? data.headers.token : false;

                                // Verify that the given token is valid and belongs the the user who created the order
                                tokens.verifyToken( token, element.phone, ( ( tokenIsValid ) => {
                                    if ( tokenIsValid ) {

                                        // Calling the AddItem function for update the order
                                        lib.addItem( orderModel.content, element, orderArray, callback );
                                    } else {
                                        callback( 403 );
                                    }
                                }));
                            }
                        }
                    });
                } else {
                    callback( 400, { Error : 'Order orderId did not exist' } );
                }
            }));    
        } else {
            callback( 400, { Error : 'Missing fields to update' } );
        }
    } else {
        callback( 400, { Error : 'Missing required field' } );
    }
};

// Function (local) to add a new item for an existing order
lib.addItem = ( updateContent, element, orderArray, callback ) => {

    // Find the menu id of the new order, if it matches with some element in the menu object
    _data.read( 'menu', 'menu', ( ( err, menuData ) => {
        if ( !err && menuData ) {

            // Calculator the total of the order or update the total
            let total = 0;
            updateContent.forEach( item => {
                menuData.forEach( menuItem => {
                    if ( item.pizzaId === menuItem.pizzaId ) {
                        total = total + ( item.quantity * menuItem.price );
                        element.content.push( item );
                    }                                                                    
                });
            });
            if ( total > 0 ) {

                // Prepare the updated order
                element.orderId = element.orderId;
                element.phone = element.phone;
                element.status = 'NEW';
                element.total = element.total + total;
                element.dateOrder = new Date();

                // Include the new updates
                // Save the object
                _data.update( 'orders', 'orders', orderArray, ( ( err ) => {
                    if ( !err ) {

                        // Return the data about the new order
                        callback( 200, element );
                    } else {
                        callback( 500, { Error : 'Could not update the new order' } );
                    }
                }));
            } else {
                callback( 400, { Error : 'Could not update the new order because not have valid menu items' } );
            }
        } else {
            callback ( 400, { Error : 'Could not find the menu object' } );
        }
    }));
};

// Orders - delete
// Required data: orderId
// Optional data: None
lib.delete = ( data, callback ) => {
    // Check that the id is valid
    orderModel.orderId = typeof(data.queryStringObject.orderId) === 'string' && data.queryStringObject.orderId.trim().length === 20 ? data.queryStringObject.orderId.trim() : false;
    
    // Check to make sure id is valid
    if ( orderModel.orderId ) {
    
        // Get the token from the headers
        let token = typeof( data.headers.token ) === 'string' ? data.headers.token : false;

        // Lookup the user by reading the token
        _data.read( 'tokens', token, ( ( err, tokenData ) => {
            if ( !err && tokenData ) {
                let userPhone = tokenData.phone;

                // Lookup the order data
                _data.read( 'orders', 'orders', ( ( err, orderData ) => {
                    if ( !err && orderData.length > 0 ) {

                        // Creating a new orderData object for update the file
                        let orderArray = [];

                        // Go through the entire object
                        orderData.forEach( element => {

                            // Verify if the order was created before
                            if ( element.orderId !== orderModel.orderId ) {
                                orderArray.push( element );
                            }
                        });

                        // Save the updated object
                        _data.update( 'orders', 'orders', orderArray, ( ( err ) => {
                            if ( !err ) {

                                // Lookup the user
                                _data.read( 'users', userPhone, ( ( err, userData ) => {
                                    if ( !err && userData ) {
                                        userModel.activeOrder = typeof( userData.activeOrder ) === 'object' && userData.activeOrder instanceof Array ? userData.activeOrder : [];
        
                                        // Remove the order from the user
                                        let checkPosition = userModel.activeOrder.indexOf( orderModel.orderId );
                                        if ( checkPosition > -1 ) {
                                            userModel.activeOrder.splice( checkPosition, 1 );
        
                                            //Re-save the user's data
                                            _data.update( 'users', userPhone, userData, ( ( err ) => {
                                                if ( !err ) {
        
                                                    // Return the data without the selected order
                                                    callback( 200, orderArray );
                                                } else {
                                                    callback( 500, { Error : 'Could not update the user' } );        
                                                }
                                            }));    
                                        } else {                                            
                                            callback( 500, { Error : 'Could not find the orderId on the user object, so could not remove it, however the order\'s file was updated' } );
                                        }
                                    } else {
                                        callback( 500, { Error : 'Could not find the user who created the order, so could not remove the order from the user object ' } );
                                    }
                                }));
                            } else {
                                callback( 500, { Error : 'Could not delete the order number: ' + orderModel.orderId } );
                            }
                        }));
                    } else {
                        callback( 400, { Error : 'Order file did not exist' } );
                    }
                }));
            } else {
                callback( 403 );
            }
        }));
    } else {
        callback( 400, { Error : 'Missing required field' } );
    }    
};

// Export the module
module.exports = lib;

