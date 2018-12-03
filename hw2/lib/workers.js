/**
 * 
 * Worker related task
 * 
 */

// Dependencies
let http = require( 'http' );
let https = require( 'https' );
let url =  require( 'url' );
let helpers = require( './helpers' );
let _data = require( './data' );
let _log = require('./logs');
let util = require( 'util' );
let debug = util.debuglog( 'workers' );

// Container for the module (to be exported)
let workers = {};


// Lookup all checks, get, their data, send to a validator
workers.gatherAllChecks = () => {
    // Get all the checks
    _data.list( 'checks', ( ( err, checks ) => {
        if ( !err && checks && checks.length > 0 ) {
            checks.forEach( ( check ) => {
                // Read in the check data
                _data.read ( 'checks', check, ( ( err, originalCheckData ) => {
                    if ( !err && originalCheckData ) {
                        // Pass it to the check validator, and let that function continue or log errors as needed
                        workers.validateCheckData( originalCheckData );
                    } else {
                        debug( 'Error reading one of the checks data' );
                    }
                }));
            });
        } else {
            debug( 'Error: Could not find any checks tio process' );
        }
    }));
};

// Sanity-check the check-data
workers.validateCheckData = ( originalCheckData ) => {
    originalCheckData = typeof( originalCheckData ) === 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof( originalCheckData.id ) === 'string' && originalCheckData.id.trim().length === 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof( originalCheckData.userPhone ) === 'string' && originalCheckData.userPhone.trim().length === 8 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof( originalCheckData.protocol ) === 'string' && [ 'http', 'https' ].indexOf( originalCheckData.protocol ) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof( originalCheckData.url ) === 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof( originalCheckData.method ) === 'string' && [ 'post', 'get', 'put', 'delete' ].indexOf( originalCheckData.method ) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof( originalCheckData.successCodes ) === 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof( originalCheckData.timeoutSeconds ) === 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set the keys that may not be set (if the workers have never seen this chech before)
    originalCheckData.state = typeof( originalCheckData.state ) === 'string' && [ 'up', 'down' ].indexOf( originalCheckData.state ) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof( originalCheckData.lastChecked ) === 'number' && originalCheckData.lastChecked > 0  ? originalCheckData.lastChecked : false;

    // If all the checks pass, pass the data along to the next step in the process
    if ( originalCheckData.id && originalCheckData.userPhone && originalCheckData.protocol && originalCheckData.url && originalCheckData.method && originalCheckData.successCodes && originalCheckData.timeoutSeconds ) {
        workers.performCheck( originalCheckData );
    } else {
        debug( 'Error: One of the checks is not properly formatted. Skipping it.' );
    }
};

// Perform the check, send  the originalCheckData and the outcome of the check process, to the next step in the process
workers.performCheck = ( originalCheckData ) => {
    // Prepare the initial check outcome
    let checkOutcome = {
        error : false, 
        responseCode : false
    };

    // Mark that the outcome has not been sent yet
    let outcomeSent = false;

    // Parse the hostname and the path out of the original check data
    let parsedUrl = url.parse( originalCheckData.protocol + '://' + originalCheckData.url, true );
    let hostName = parsedUrl.hostname;
    let path = parsedUrl.path;

    // Construct the request
    let requestDetails = {
        protocol : originalCheckData.protocol + ':',
        hostname : hostName,
        method : originalCheckData.method.toUpperCase(),
        path : path,
        timeout : originalCheckData.timeoutSeconds * 1000
    };

    // Instantiate the request object (using either the http or https module)
    let _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
    let req = _moduleToUse.request( requestDetails, ( ( res ) => {
        // Grab the status of the sent request
        let status = res.statusCode;

        // Update the checkoutcome and pass the data along 
        checkOutcome.responseCode = status;
        if ( !outcomeSent ) {
            workers.processCheckOutcome( originalCheckData, checkOutcome );
            outcomeSent = true;
        }
    }));

    // Bind to the error event so it doesn't get thrown
    req.on( 'error', ( ( e ) => {
        // Update the checkoutcome and pass the data along 
        checkOutcome.error = {
            error : true,
            value : e
        };
        if ( !outcomeSent ) {
            workers.processCheckOutcome( originalCheckData, checkOutcome );
            outcomeSent = true;
        }
    }));

    // Bind to the timeout event
    req.on( 'timeout', ( ( e ) => {
        // Update the checkoutcome and pass the data along 
        checkOutcome.error = {
            error : true,
            value : 'timeout'
        };
        if ( !outcomeSent ) {
            workers.processCheckOutcome( originalCheckData, checkOutcome );
            outcomeSent = true;
        }
    }));

    // End the request
    req.end();
};

// Process the check outcome, update the check data  as needed, trigger an alert if needed
// Special logic for accomadating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = ( originalCheckData, checkOutcome ) => {
    // Decide if the check is up or down
    let state = !checkOutcome.error && checkOutcome.responseCode &&  originalCheckData.successCodes.indexOf( checkOutcome.responseCode ) > -1 ? 'up' : 'down';

    // Decide if an alert is warranted
    let alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Log the outcome
    let timeOfCheck = Date.now();
    workers.log( originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck );

    // Update the check data
    let newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    // Save the updates
    _data.update( 'checks', newCheckData.id, newCheckData, ( ( err ) => {
        if ( !err ) {
            // Save the  new cheack data to the next phase in the process if needed
            if ( alertWarranted ) {
                workers.alertUserToStantusChange( newCheckData );
            } else {
                debug( 'Check outcome has not changed.' );
            }
        } else {
            debug( 'Error: trying to save updates to one of the checks.' );
        }
    }));
};

// Alert the user as to a change in their check status
workers.alertUserToStantusChange = ( newCheckData ) => {
    let msg = 'Alert: Your check for: ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
    helpers.sendTwilioSms( newCheckData.userPhone, msg, ( ( err ) => {
        if ( !err ) {
            debug( 'Success!: User was alerted to a status change in their check, via SMS: ', msg );
        } else {
            debug( 'Error: Could not send SMS alert to user.' );
        }
    }));    
};

// Writing the log into a file
workers.log = ( originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck ) => {
    // Form the log data
    let logData = {
        check : originalCheckData,
        outcome : checkOutcome,
        state : state,
        alert : alertWarranted,
        time : timeOfCheck
    };

    // Convert data to a string
    let logstring = JSON.stringify( logData );

    // Determine the name of the log file
    let logNameFile = originalCheckData.id;

    // Append the log string to the file
    _log.append( logNameFile, logstring, ( ( err ) => {
        if ( !err ) {
            debug( 'Success: Logging to file succeeded' );
        } else {
            debug( 'Error: Logging to file failed' );
        }
    }));
};

// Timer to execute the worker-process once time per minute
workers.loop = () => {
    setInterval( () => {
        workers.gatherAllChecks();
    }, 1000 * 60 );
};

// Rotate (compress) the log files
workers.rotateLogs = () => {
    // List all the (non compressed) log files
    _log.list( false, ( ( err, logs ) => {
        if ( !err && logs && logs.length > 0 ) {
            logs.forEach( ( logName ) => {
                // Compress the data to a different file
                let logId = logName.replace( '.log', '' );
                let newFileId = logId + '-' + Date.now();
                _log.compress( logId, newFileId, ( ( err ) => {
                    if ( !err ) {
                        // Truncate the log
                        _log.truncate( logId, ( ( err ) => {
                            if ( !err ) {
                                debug( 'Success: Truncating log file' );
                            } else {
                                debug( 'Error: Truncating log file', err );
                            }                    
                        }));
                    } else {
                        debug( 'Error: compressing one of the log files', err );
                    }            
                }));
            });
        } else {
            debug( 'Error: Could not find any logs to rotate' );
        }
    })); 
};

// Timer to execute the log-rotation once per day
workers.logRotationLoop = () => {
    setInterval( () => {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
};

// Init script
workers.init = () => {

    // Send to console, in  color
    console.log( '\x1b[35m%s\x1b[0m', 'Background workers are running' );


    // Execute all the checks inmediatly
    workers.gatherAllChecks();

    // Call the loop so the checks will execute later on
    workers.loop();

    // Compress all the logs inmediatly
    workers.rotateLogs();

    // Call the compression loop so logs  will be crompressed later on
    workers.logRotationLoop();

};

// Export the module
module.exports = workers;
