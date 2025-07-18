# Restaurant Point of Sale (POS) System

A complete POS system for restaurants with role-based access control, order management, and item tracking.

## Features

- **Role-based Access Control**: Different interfaces for Administrators, Cashiers, Waiters, Kitchen Staff, and Bartenders
- **Order Management**: Create, track, and process orders
- **Item Management**: Manage food and drink items with prices
- **Receipt Generation**: Generate receipts for completed orders
- **Reporting**: Generate sales reports and analytics
- **Offline/Online Sync**: Continue working even during internet outages

## Installation

1. Clone the repository
2. Install dependencies:
```
cd pos-system
npm install
cd client
npm install
cd ../server
npm install
```

## Running the Application

1. Reset the database (optional):
```
cd server
node src/reset-db.js
```

2. Start the application:
```
cd ..
npm run dev
```

3. If port 5000 is already in use:
```
node kill-process.js
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5174
- Backend API: http://localhost:5001

## Default Users

| Username | Password | PIN Code | Role | Login Method |
|----------|----------|----------|------|-------------|
| admin | admin123 | N/A | Administrator | Username/Password |
| cashier1 | cashier123 | N/A | Cashier | Phone/Password |
| waiter1 | N/A | 123456 | Waiter | PIN Code |
| kitchen1 | kitchen123 | N/A | Kitchen Staff | Username/Password |
| bartender1 | bartender123 | N/A | Bartender | Username/Password |

## Login Methods

- **Regular Login**: For Administrators, Kitchen Staff, and Bartenders (username/password)
- **Cashier Login**: Phone number and password
- **PIN Login**: For waiters (6-digit PIN)

## Role-based Access

### Administrator
- Manage users (create, edit, delete)
- Manage menu items (food and drinks)
- View reports and analytics
- Configure system settings

### Cashier
- Create and manage orders
- Process payments
- Generate receipts
- View order history

### Waiter
- Manage tables
- Take orders
- Update order status

### Kitchen Staff
- View food orders
- Update food item status (in preparation, ready)
- Mark items as complete

### Bartender
- View drink orders
- Update drink item status
- Mark items as complete

## Troubleshooting

### Port in Use Error
If you see the error "Error: listen EADDRINUSE: address already in use :::5000", run:
```
node kill-process.js
```

### Authentication Issues
If you have trouble logging in:
1. Make sure the backend server is running
2. Try resetting the database: `cd server && node src/reset-db.js`
3. Use the default credentials listed above

## API Endpoints

- `/api/auth/login` - User authentication
- `/api/users` - User management (admin only)
- `/api/items` - Menu item management
- `/api/orders` - Order management
- `/api/reports` - Reporting and analytics #   P O S - s y s t e m  
 #   b i s r a t - h o t e l  
 