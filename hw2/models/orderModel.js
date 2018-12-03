/** 
 * 
 * Order data model
 * 
*/

// Dependencies

// Container for the module (to be exported)
let order = {};

// Definition
order.model = ( ( ) => {
    this.orderId = orderId;
    this.phone = phone;
    this.status = status;
    this.total = total;
    this.dateOrder = dateOrder;
    this.content = content;
});

// Export the module
module.exports = order;
