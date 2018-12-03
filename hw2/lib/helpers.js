/**
 * 
 * Helpers for various tasks
 * 
 */

// Dependencies
let crypto = require( 'crypto' );
let config = require( './config' );
let https = require( 'https' );
let querystring = require( 'querystring' );

// Container for all the helpers
let helpers = {};

// Hash function. Create a SHA256 hash
helpers.hash = ( str ) => {
    if ( typeof(str) === 'string' && str.length > 0 ) {
        let hash = crypto.createHmac( 'sha256', config.hashingSecret ).update( str ).digest( 'hex' );
        return hash;
    } else {
        return false;
    }
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = ( str ) => {
    try {
        let obj = JSON.parse( str );
        return obj;
    } catch( e ) {
        return {};
    }
};

// Create a string of random aphanumeric characters, of a given length
helpers.createRandomString = ( strLength ) => {
    strLength = typeof(strLength) === 'number' && strLength > 0 ? strLength : false;
    if ( strLength ) {
        // Define all the posible characters that could go into a string
        let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

        // Start the final string
        let str = '';
        for ( i = 1; i <= strLength; i++ ) {
            // Get a random character from the possibleCharacters string
            let randomCharacter = possibleCharacters.charAt( Math.floor( Math.random() * possibleCharacters.length ) );
            // Append this character to the final string
            str += randomCharacter;
        }

        // Return the final string
        return str;
    } else {
        return false;
    }
};

// Send SMS message via Twilio
helpers.sendTwilioSms = ( phone, msg, callback ) => {
    // Validate parameters
    phone = typeof( phone ) === 'string' && phone.trim().length === 8 ? phone.trim() : false;
    msg = typeof( msg ) === 'string' && msg.trim().length > 0  && msg.trim().length < 1600 ? msg.trim() : false;
    if ( phone && msg ) {
        // Configure  the request payload
        let payload = {
            From : config.twilio.fromPhone,
            To : '+591' + phone,
            Body : msg
        };

        // Stringify the payload
        let stringPayload = querystring.stringify( payload );

        // Configure the request details
        let requestDetails = {
            protocol : 'https:',
            hostname : 'api.twilio.com',
            method : 'POST',
            path : '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            auth : config.twilio.accountSid + ':' + config.twilio.authToken,
            headers : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length' : Buffer.byteLength( stringPayload )
            }
        };

        // Instantiate the request object
        let req = https.request( requestDetails, ( ( res ) => {
            res.on( 'data', data => {
  
                // Grab the status of the sent request
                let status = res.statusCode;
                let outputData = JSON.parse( data.toString() );
                
                // Callback successfully if the request went through
                if ( status === 200 || status === 201 ) {
    
                    // Data is convert into JSON object //false
                    callback( outputData ); 
                } else {
                    callback( 'Status code returned was ' + status );
                }
            });                
        }));

        // Bind to the error event so it doesn't get thrown
        req.on( 'error', ( ( e ) => {
            callback( e );
        }));

        // Add the payload
        req.write( stringPayload );

        // End the request
        req.end();
    } else {
        callback( 'Given parameters were missing or invalid' );
    }
};

// Validate email address
helpers.validateEmail = ( emailAddress ) => {
    let regExp = /^[-\w.%+]{1,64}@(?:[A-Z0-9-]{1,63}\.){1,125}[A-Z]{2,63}$/i;
    if ( regExp.test( emailAddress ) ) {
        return( true );
    } else {
        return( false );
    }
};

helpers.colorLog = ( message, color="", style="" ) => {

    let colors = {
      black : "\x1b[30m",
      red : "\x1b[31m",
      green : "\x1b[32m",
      yellow : "\x1b[33m",
      blue : "\x1b[34m",
      magenta : "\x1b[35m",
      cyan : "\x1b[36m",
      white : "\x1b[37m",
    };
  
    let styles = {
      reset : "\x1b[0m",
      bright : "\x1b[1m",
      dim : "\x1b[2m",
      underscore : "\x1b[4m",
      blink : "\x1b[5m",
      reverse : "\x1b[7m",
      hidden : "\x1b[8m",
    };
  
    let msgColor = typeof(colors[color]) == "string" ? colors[color] : "";
    let msgStyle = typeof(styles[style]) == "string" ? styles[style] : "";
  
    console.log(msgColor + msgStyle + "%s" + styles.reset, message);
};
  
// Payment through the STRIPE API
helpers.payment = ( orderData, callback ) => {

    // Define payload
    let payload = {
        amount : orderData.total,
        currency : config.currency,
        source : orderData.source,
        description : orderData.description
      };

    // Stringify the payload
    let stringPayload = querystring.stringify(payload);

    // Define the API REST options
    let requestDetails = {
        protocol : 'https:',
        hostname : 'api.stripe.com',
        path : '/v1/charges',
        method : 'POST',
        auth : config.stripe,
        headers : {
            'Content-Type' : 'application/x-www-form-urlencoded',
            'Content-Length' : Buffer.byteLength(stringPayload)
        }
    };
  
    // Instantiate the request object
    let req = https.request(requestDetails, res => {
        res.on( 'data', data => {
  
            // Grab the status of the sent request
            let status = res.statusCode;
            let outputData = JSON.parse( data.toString() );
            
            // Callback successfully if the request went through
            if ( status === 200 || status === 201 ) {

                // Data is convert into JSON object
                callback( outputData );
            } else {
                callback( 'Status code returned was ' + status );
            }
        });
    });
  
    // Bind to the error event so it doesn't get thrown
    req.on( 'error', ( ( e ) => {
        callback( e );
    }));
  
    // Add the payload
    req.write( stringPayload );

    // End the request
    req.end();
};

// Email through the MAILGUN API
helpers.sendEmail = ( orderData, paymentData, callback ) => {    
    // Define the email content
    let message = helpers.emailContent( orderData, paymentData );

    // Define payload
    let payload = {
        from : config.mailGun.from,
        to : orderData.email,
        subject : orderData.description,
        text : message
      };

    // Stringify the payload
    let stringPayload = querystring.stringify(payload);

    // Define the API REST options
    let requestDetails = {
        protocol : 'https:',
        hostname : 'api.mailgun.net',
        path : '/v3/' + config.mailGun.domain + '/messages',
        method : 'POST',
        auth : config.mailGun.apiKey,
        headers : {
            'Content-Type' : 'application/x-www-form-urlencoded',
            'Content-Length' : Buffer.byteLength(stringPayload)
        }
    };
    
    // Instantiate the request object
    let req = https.request(requestDetails, res => {
        res.on( 'data', data => {
  
            // Grab the status of the sent request
            let status = res.statusCode;
            let outputData = JSON.parse( data.toString() );
            
            // Callback successfully if the request went through
            if ( status === 200 || status === 201 ) {

                // Data is convert into JSON object
                callback( outputData );
            } else {
                callback( 'Status code returned was ' + status );
            }
        });
    });
  
    // Bind to the error event so it doesn't get thrown
    req.on( 'error', ( ( e ) => {
        callback( e );
    }));
  
    // Add the payload
    req.write( stringPayload );

    // End the request
    req.end();
};

// Assembling the email content
helpers.emailContent = ( orderData, paymentData ) => {
    let content = ' Your pizza order has the follow information:\n ';
    content += 'Order Id: ' + orderData.orderId + '\n';
    content += 'Phone: ' + orderData.phone + '\n';
    content += 'Date: ' + orderData.dateOrder + '\n';
    content += 'Total: ' + orderData.total + '\n';
    content += 'Currency: ' + paymentData.currency + '\n';
    content += 'Detail:\n';
    orderData.content.forEach( element => {
        content += '\t Pizza ID: ' + element.pizzaId + ' ==> Quantity: ' + element.quantity + '\n';        
    });
    content += 'Credit Card: ' + orderData.source + '\n';
    content += 'Pay Status: ' + paymentData.paid + '\n';
    return( content );
};

// Export the module
module.exports = helpers;