# Homework Assignment #2

This is my homework 2, a API for a pizza order.

## Overview

- Using the available endpoints we can order a pizza and pay to a credit card and receive a email of confirmation of our order.
- Using only Node code without dependencies or npm libraries.

## Testing

### Postman

```
Create users:
Url: localhost:3000/users
Method: POST
Body: 
{
	"firstName" : "Name",
	"lastName" : "Last Name",
	"phone" : "12345678",
	"email" : "yyyyyyy@gmail.com",
	"address" : "XXXXXX",
	"password" : "SomePassword"
}
```

```
Login users:
Url: localhost:3000/tokens
Method: POST
Body: 
{
	"phone" : "12345678",
	"password" : "SomePassword"
}
```

```
View Pizza Menu:
Url: localhost:3000/menu?phone=12345678
Method: GET
Headers: 
{
	"token" : "7d7go9w7wvi57gaf8k9k"
}
```

```
Order Pizza:
Url: localhost:3000/orders
Method: POST
Headers: 
{
	"token" : "7d7go9w7wvi57gaf8k9k",
  "Content-Type" : "application/json"
}
Body:
{
	"content" : [
		{
			"pizzaId" : 9,
			"quantity" : 3
			
		},
		{
			"pizzaId" : 10,
			"quantity" : 2
			
		},
		{
			"pizzaId" : 11,
			"quantity" : 5
			
		}
		]
}
```

```
Pay and close Order Pizza:
Url: localhost:3000/payment
Method: GET
Headers: 
{
	"token" : "7d7go9w7wvi57gaf8k9k",
  "Content-Type" : "application/json"
}
Body:
{
  "orderId": "21h921tkqxwxxe4ydk4m",
	"creditCard" : "tok_visa"
}
```

## License

MIT
