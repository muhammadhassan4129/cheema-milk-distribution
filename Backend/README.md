# Cheema Dairy - Backend API

Node.js + Express + MongoDB backend for Cheema Milk Distribution & Collection System.

## Folder Structure

```
Backend/
├── src/
│   ├── app.js                    ← Express app entry point
│   ├── config/
│   │   └── db.js                 ← MongoDB connection
│   ├── models/                   ← Mongoose schemas
│   │   ├── User.js
│   │   ├── Vehicle.js
│   │   ├── Route.js
│   │   ├── RouteCollection.js
│   │   ├── MilkRecord.js
│   │   ├── Dispatch.js
│   │   ├── AdvanceTransaction.js
│   │   ├── AccountRecord.js
│   │   ├── LabReport.js
│   │   ├── PurchaseLedger.js
│   │   ├── SaleLedger.js
│   │   ├── SupplierProfile.js
│   │   └── CustomerProfile.js
│   ├── controllers/              ← Business logic
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── vehicle.controller.js
│   │   ├── route.controller.js
│   │   ├── routeCollection.controller.js
│   │   ├── milkRecord.controller.js
│   │   ├── dispatch.controller.js
│   │   ├── advance.controller.js
│   │   ├── account.controller.js
│   │   ├── lab.controller.js
│   │   └── ledger.controller.js
│   ├── routes/                   ← Express routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── vehicle.routes.js
│   │   ├── route.routes.js
│   │   ├── routeCollection.routes.js
│   │   ├── milkRecord.routes.js
│   │   ├── dispatch.routes.js
│   │   ├── advance.routes.js
│   │   ├── account.routes.js
│   │   ├── lab.routes.js
│   │   └── ledger.routes.js
│   ├── middleware/
│   │   ├── auth.middleware.js    ← JWT verify
│   │   ├── role.middleware.js    ← Role check (Admin/Driver/Accountant)
│   │   ├── validate.middleware.js← Input validation
│   │   └── error.middleware.js   ← Global error handler
│   └── utils/
│       ├── ApiResponse.js        ← Standard success response class
│       ├── ApiError.js           ← Custom error class
│       ├── asyncHandler.js       ← try-catch wrapper
│       └── seed.js               ← Database seed script
├── .env                          ← Environment variables
└── package.json
```

## Setup

### 1. Dependencies install karo
```bash
npm install
```

### 2. .env file configure karo
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/cheema_dairy
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

### 3. Database seed karo (default users + data)
```bash
npm run seed
```

### 4. Server start karo
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

## API Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | /api/auth/login | Login | Public |
| GET | /api/auth/me | Current user | All |
| GET | /api/users | All users | Admin |
| POST | /api/users | Create user | Admin |
| PUT | /api/users/:id | Update user | Admin |
| DELETE | /api/users/:id | Delete user | Admin |
| PATCH | /api/users/:id/toggle-status | Toggle status | Admin |
| GET | /api/vehicles | All vehicles | Admin, Accountant |
| POST | /api/vehicles | Add vehicle | Admin |
| PUT | /api/vehicles/:id | Update vehicle | Admin |
| DELETE | /api/vehicles/:id | Delete vehicle | Admin |
| GET | /api/routes | All routes | All |
| POST | /api/routes | Create route | Admin |
| GET | /api/route-collections | Collections | All |
| POST | /api/route-collections | New collection | Admin, Driver |
| PATCH | /api/route-collections/:id/submit | Submit | Admin, Driver |
| GET | /api/milk-records | Milk records | Admin, Accountant |
| POST | /api/milk-records | Add record | All |
| POST | /api/milk-records/bulk | Bulk add | Admin, Driver |
| GET | /api/dispatches | All dispatches | All |
| POST | /api/dispatches | Create dispatch | Admin, Accountant |
| PATCH | /api/dispatches/:id/status | Update status | All |
| GET | /api/advances | Transactions | All |
| POST | /api/advances | Add transaction | Admin, Accountant |
| GET | /api/accounts | Account records | Admin, Accountant |
| POST | /api/accounts | Add record | Admin, Accountant |
| GET | /api/accounts/summary | P&L summary | Admin, Accountant |
| GET | /api/lab-reports | Lab reports | Admin, Accountant |
| POST | /api/lab-reports | Add report | Admin, Accountant |
| GET | /api/ledger/purchase | Purchase ledger | Admin, Accountant |
| GET | /api/ledger/sale | Sale ledger | Admin, Accountant |
| GET | /api/ledger/suppliers | Suppliers | All |
| GET | /api/ledger/customers | Customers | All |

## Default Login Credentials (after seed)
- Admin: `admin` / `password`
- Driver: `johnd` / `password`
- Accountant: `saraha` / `password`
