/** 
 * 
 * User data model
 * 
*/

// Dependencies

// Container for the module (to be exported)
let user = {};

// Definition
user.model = ( ( ) => {
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.hashedPassword = hashedPassword;
    this.email = email;
    this.address = address;
    this.activeOrder = activeOrder;
});

// Export the module
module.exports = user;
