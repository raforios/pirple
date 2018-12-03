/** 
 * 
 * CRUD library for files
 * 
*/

// Dependencies
let fs = require( 'fs' );
let path = require( 'path' );
let helpers = require( './helpers' );

// Container for the module (to be exported)
let lib = {};

// Base directory of the data folder
lib.baseDir = path.join( __dirname, '/../.data/' );

// Write data to a file
lib.create = ( dir, file, data, callback ) => {
    // Open the file for writing
    fs.open( lib.baseDir + dir + '/' + file + '.json', 'wx', ( ( err, fileDescriptor ) => {
        if ( !err && fileDescriptor ) {
            // Convert data to string
            let stringData = JSON.stringify( data );

            // Write to file and close it
            fs.writeFile( fileDescriptor, stringData, ( ( err ) => {
                if ( !err ) {
                    fs.close( fileDescriptor, ( ( err ) => {
                        if ( !err ) {
                            callback( false );
                        } else {
                            callback( 'Error closing existing file' );
                        }
                    }));
                } else {
                    callback( 'Error writing to existing file' );
                }
            }));
        } else {
            callback( 'Could not create the new file, it may already exist' );
        }
    }));
};

// Read data from a file
lib.read = ( dir, file, callback ) => {
    fs.readFile( lib.baseDir + dir + '/' + file + '.json', 'utf-8', ( ( err, data ) => {
        if ( !err && data ) {
            let parseData = helpers.parseJsonToObject( data );
            callback( false, parseData);
        } else {
            callback( err, data );
        }
    }));
};

// Update data inside a file
lib.update = ( dir, file, data, callback ) => {
    // Openthe file for writing
    fs.open( lib.baseDir + dir + '/' + file + '.json', 'r+', ( ( err, fileDescriptor ) => {
        if ( !err && fileDescriptor ) {
            // Convert data to string
            let stringData = JSON.stringify( data );

            // Truncate the file
            fs.ftruncate( fileDescriptor, ( ( err ) => {
                if ( !err ) {
                    // Write to file and close it
                    fs.writeFile( fileDescriptor, stringData, ( ( err ) => {
                        if ( !err ) {
                            fs.close( fileDescriptor, ( ( err ) => {
                                if ( !err ) {
                                    callback( false );
                                } else {
                                    callback( 'Error closing existing file' );
                                }
                            }));
                        } else {
                            callback( 'Error writing to existing file' );
                        }
                    }));
                } else {
                    callback( 'Error truncating file' );
                }
            }));
        } else {
            callback( 'Could not open the file for updating, it may not exist yet' );
        }
    }));
};

// Delete a file
lib.delete = ( dir, file, callback ) => {
    // Unlink the file
    fs.unlink( lib.baseDir + dir + '/' + file + '.json', ( ( err ) => {
        if ( !err ) {
            callback( false );
        } else {
            callback( 'Error deleting file' );
        }
    }));
};

// List all the items in a directory
lib.list = ( dir, callback ) => {
    fs.readdir( lib.baseDir + dir + '/', ( ( err, data ) => {
        if ( !err && data.length > 0 ) {
            let trimFileNames = [];
            data.forEach( ( fileName ) => {
                trimFileNames.push( fileName.replace( '.json', '' ) );
            });
            callback( false, trimFileNames );
        } else {
            callback( err, data );
        }
    }));
};

// Export the module
module.exports = lib;

