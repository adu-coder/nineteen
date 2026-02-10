# Nineteen Finance Backend

Backend API server for the Nineteen Finance application using MongoDB.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:
   Copy `.env` file and update with your MongoDB credentials.

3. Start the server:

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/google` - Google Sign-In (get or create user)

### Users

- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/:userId` - Update user profile
- `GET /api/users/search/:email` - Search user by email

### Friends

- `POST /api/users/:userId/friends` - Add friend
- `DELETE /api/users/:userId/friends/:friendId` - Remove friend
- `GET /api/users/:userId/friends` - Get all friends

### Transactions

- `GET /api/users/:userId/transactions` - Get all transactions
- `POST /api/users/:userId/transactions` - Create transaction
- `PUT /api/users/:userId/transactions/:transactionId` - Update transaction
- `DELETE /api/users/:userId/transactions/:transactionId` - Delete transaction
- `GET /api/users/:userId/friends/:friendId/transactions` - Get friend's transactions

### Health

- `GET /health` - Server health check

## Database Schema

### User

- email (unique)
- displayName
- photoUrl
- googleId
- friendIds (array of user IDs)
- shareWithFriends (boolean)

### Transaction

- userId
- title
- amount
- tags (array)
- description
- date
- isExpense (boolean)

## Deployment

### Local

```bash
npm start
```

### Cloud (Heroku, Railway, etc.)

1. Set environment variables
2. Deploy the backend folder
3. Update Flutter app with production API URL

## Default Port

3000 (configurable via PORT environment variable)
# nineteen
