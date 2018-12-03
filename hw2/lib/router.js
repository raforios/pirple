/**
 * 
 * Router
 * 
 */

// Dependencies
let handlers = require( './handlers' );

// Container for the module (to be exported)
let router = {};

 // Define a request router
router = {
    ping : handlers.ping,
    users : handlers.users,
    tokens : handlers.tokens,
    checks : handlers.checks,
    menu : handlers.menu,
    orders : handlers.orders,
    payment : handlers.payment
};

// Export the module
module.exports = router;
