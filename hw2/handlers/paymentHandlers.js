/**
 * 
 * Payments Handlers
 * 
 */

// Dependencies
let _data = require( '../lib/data' );
let tokens = require( './tokenHandlers' );
let orderModel = require( '../models/orderModel' );
let helpers = require( '../lib/helpers' );

// Container for the module (to be exported)
let lib = {};

// Payment - get
// Required data: orderId, credit card information
// Optional data: None
lib.get = ( data, callback ) => {
    // Check for the required field
    orderModel.orderId = typeof(data.payload.orderId) === 'string' && data.payload.orderId.trim().length === 20 ? data.payload.orderId.trim() : false;
    let creditCard = typeof( data.payload.creditCard ) === 'string' && data.payload.creditCard.trim().length > 0 ? data.payload.creditCard.trim() : false;

    if ( orderModel.orderId && creditCard ) {

        // Lookup the order
        _data.read( 'orders', 'orders', ( ( err, orderData ) => {
            if ( !err && orderData ) {

                // Assign the orderData object to a new array for update the array
                let orderArray = orderData;

                // Go through the entire object
                orderData.forEach( element => {

                    // Verify if the order was created before
                    if ( element.orderId === orderModel.orderId ) {

                        // Get the token from the headers
                        let token = typeof( data.headers.token ) === 'string' ? data.headers.token : false;

                        // Verify that the given token is valid and belongs the the user who created the order
                        tokens.verifyToken( token, element.phone, ( ( tokenIsValid ) => {
                            if ( tokenIsValid ) {

                                // Executing the payment and sending the email
                                lib.executePayment( element, orderArray, creditCard, callback );
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

lib.executePayment = ( element, orderArray, creditCard, callback ) => {
    // Lookup the user for extract the email
    _data.read( 'users', element.phone, ( ( err, userData ) => {
        if ( !err && userData ) {
            userData.activeOrder = typeof( userData.activeOrder ) === 'object' && userData.activeOrder instanceof Array ? userData.activeOrder : [];

            // Prepare the order data
            element.orderId = element.orderId;
            element.phone = element.phone;
            element.total = element.total;
            element.dateOrder = element.dateOrder;
            element.content = element.content;
            element.description = 'Payment for the order: ' + element.orderId;
            element.source = creditCard;
            element.email = userData.email;

            // Make the payment
            helpers.payment( element, ( resp ) => {
                let paymentData = {
                    id : resp.id,
                    object : resp.object,
                    amount : resp.amount,
                    currency : resp.currency,
                    paid : resp.paid
                };

                // If the payment was executed updated it the order with a DELIVERED status, else REJECTED
                if ( resp.paid ) {
                    element.status = 'DELIVERED';
                } else {
                    element.status = 'REJECTED';
                }

                // Payment ready and send the email with the order data
                helpers.sendEmail( element, paymentData, ( result ) => {
                    // Include the new updates
                    // Save the object
                    _data.update( 'orders', 'orders', orderArray, ( ( err ) => {
                        if ( !err ) {

                            // Remove the order from the user
                            let checkPosition = userData.activeOrder.indexOf( element.orderId );
                            if ( checkPosition > -1 ) {
                                userData.activeOrder.splice( checkPosition, 1 );
        
                                //Re-save the user's data
                                _data.update( 'users', element.phone, userData, ( ( err ) => {
                                    if ( !err ) {
        
                                        // Return the final Data
                                        let response = {
                                            paymentData : paymentData,
                                            element : element,
                                            result : result
                                        };
                                        callback( 200, response );
                                    } else {
                                        callback( 500, { Error : 'Could not update the user' } );        
                                    }
                                }));    
                            } else {                                            
                                callback( 500, { Error : 'Could not find the orderId on the user object.' } );
                            }    
                        } else {
                            callback( 500, { Error : 'Could not update the new order' } );
                        }
                    }));
                });
            });
        } else {
            callback( 500, { Error : 'Could not find the user who created the order, so could not remove the order from the user object ' } );
        }
    }));
};

// Export the module
module.exports = lib;

