# Flight Booking Frontend

A modern, responsive flight booking application built with React, TypeScript, and Tailwind CSS.

## Features

- **Flight Search**: Search flights by origin, destination, date, and passengers
- **User Authentication**: Register, login, and manage user profiles
- **Booking Management**: Book flights, view booking history, download itineraries
- **Real-time Updates**: Live booking and payment status updates via WebSocket
- **Payment Integration**: Secure payment processing with Razorpay
- **Admin Dashboard**: Analytics and reports for administrators
- **Responsive Design**: Mobile-first design that works on all devices
- **Dynamic Insights**: Popular routes and booking statistics on homepage

## Prerequisites

Before you begin, ensure you have:
- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Git**

## Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api/v1

# WebSocket Configuration (optional)
VITE_WEBSOCKET_URL=ws://localhost:5000
```

For production deployment, create `.env.production`:

```env
VITE_API_BASE_URL=https://your-backend.onrender.com/api/v1
VITE_WEBSOCKET_URL=wss://your-backend.onrender.com
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/booking-frontend.git
cd booking-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your backend API URL
```

## Running Locally

### Development Mode (with hot reload):
```bash
npm run dev
```

The application will start at `http://localhost:5173`

### Build for Production:
```bash
npm run build
```

### Preview Production Build:
```bash
npm run preview
```

## Project Structure

```
booking-frontend/
├── src/
│   ├── assets/          # Images and static files
│   ├── components/      # Reusable React components
│   ├── context/         # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── services/        # API service layer
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── .env                 # Environment variables
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Key Features Guide

### User Registration & Login

1. Navigate to `/register` to create a new account
2. Fill in all required fields with validation:
   - Name: minimum 2 characters
   - Email: valid email format
   - Phone: 10 digits
   - Password: 8+ characters with uppercase, lowercase, and number
3. After registration, you'll be redirected to the home page

### Searching Flights

1. On the homepage, enter:
   - Origin airport (3-letter IATA code or city name)
   - Destination airport (3-letter IATA code or city name)
   - Departure date (future dates only)
   - Return date (for round trip)
   - Number of passengers
2. Click "Search Flights" to view available flights
3. Use the search form on the results page to refine your search

### Booking a Flight

1. Select a flight from search results
2. Choose cabin class (Economy, Business, or First)
3. Fill in passenger details:
   - Personal information
   - Passport details
   - Seat selection (shows occupied seats)
   - Meal preferences
4. Review fare breakdown
5. Proceed to payment

### Payment Process

1. Review booking details and total amount
2. Click "Pay Now" to initiate Razorpay payment
3. Complete payment using test credentials (in test mode):
   - Card: 4111 1111 1111 1111
   - Expiry: Any future date
   - CVV: Any 3 digits
4. Receive booking confirmation

### Managing Bookings

1. Navigate to "My Bookings" from the navigation menu
2. View all your bookings with filters:
   - All bookings
   - Confirmed
   - Pending
   - Cancelled
3. Download itinerary as text file
4. Complete pending payments
5. Cancel bookings if needed

### Admin Features

Admin users can access:
- **Analytics Dashboard** (`/analytics`):
  - Total bookings and revenue
  - Status breakdown
  - Popular routes
  - Monthly trends
  - Recent bookings

## Deployment

### Deploy to Render

1. Push your code to GitHub
2. Create a new Static Site on Render
3. Connect your repository
4. Configure:
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
5. Add environment variables in Render dashboard
6. Deploy

### Deploy to Netlify

1. Push your code to GitHub
2. Connect repository to Netlify
3. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables
5. Add `_redirects` file in `public/`:
```
/*    /index.html   200
```

See `DEPLOYMENT.md` for detailed deployment instructions.

## API Integration

The frontend communicates with the backend API through the `apiService` located in `src/services/api.ts`. Key features:

- **Automatic Token Refresh**: Expired access tokens are automatically refreshed
- **Error Handling**: User-friendly error messages from API responses
- **Type Safety**: Full TypeScript support for API requests/responses

## Styling

The application uses:
- **Tailwind CSS** for utility-first styling
- **Custom CSS** for specific components
- **Responsive Design** with mobile-first approach

To customize styles:
1. Edit `tailwind.config.js` for theme customization
2. Modify `src/index.css` for global styles
3. Use Tailwind classes in components

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### API Connection Issues
- Verify `VITE_API_BASE_URL` is correct in `.env`
- Check if backend server is running
- Verify CORS settings on backend

### Build Errors
- Clear `node_modules`: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check Node.js version compatibility

### Login/Authentication Issues
- Clear browser localStorage
- Check if JWT tokens are being stored correctly
- Verify backend authentication endpoints are working

## Performance Optimization

The application includes:
- Code splitting with React lazy loading
- Image optimization
- Minified production builds
- Tree shaking to remove unused code

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please create an issue in the GitHub repository.
