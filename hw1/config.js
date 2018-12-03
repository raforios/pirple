/**
 * 
 * Creating and exporting configuration variables
 * 
 */

// Container for all aenvironments
var environments = {};

// Staging (default) environment
environments.stagin = {
    httpPort : 3000,
    httpsPort: 3001,
    envName : 'stagin'
};

// Production environment
environments.production = {
    httpPort : 5000,
    httpsPort: 5001,
    envName : 'production'
};

// Determine wich environment was passed as command line argument
var currentEnvironment = typeof( process.env.NODE_ENV ) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments avobe, if not, default to staging
var environmentToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.stagin;

// Export the module
module.exports = environmentToExport;



