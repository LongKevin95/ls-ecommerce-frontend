# L&S Ecommerce Frontend

React + Vite frontend for the L&S Ecommerce project.

This app talks to the Express/MongoDB backend and includes customer, vendor,
and admin flows that were smoke-tested against the real API.

## Tech Stack

- React 19
- Vite 8
- React Router 7
- TanStack Query 5
- Axios
- Zod

## Main Features

- Customer signup and login
- Product listing, search, product detail
- Cart, checkout, wishlist
- My Orders page with order tracking
- Product review after a completed purchase
- Vendor review replies on product detail
- Vendor dashboard for products, orders, and profile
- Admin dashboard for products, orders, and account management

## Project Structure

- `src/main.jsx`: app bootstrap and providers
- `src/App.jsx`: root app shell
- `src/routes/*`: public/private/role-based routing
- `src/contexts/*`: auth, cart, theme, and wishlist state
- `src/pages/*`: customer, auth, vendor, admin, and account screens
- `src/api/*`: API-facing modules
- `src/services/*`: request helpers and API wrappers
- `src/adapters/*`: response normalization
- `src/components/*`: shared UI

## Environment

Copy `.env.example` to `.env` before starting the app:

```env
VITE_API_BASE_URL=http://127.0.0.1:8080
```

If `VITE_API_BASE_URL` is empty, the app falls back to `http://localhost:5000`.
For this project, the backend was tested on port `8080`, so set the variable
explicitly to avoid confusion.

## Local Development

```bash
npm install
npm run dev
```

Default Vite URL:

- `http://localhost:5173`

## Available Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Build

```bash
npm run build
```

## Tested Integration

The current frontend was manually tested against the backend for:

- signup and login
- homepage and product detail loading
- add to cart and checkout
- customer order tracking
- vendor create/update/delete product
- admin product approval and account status updates
- completed-order review submission
- vendor reply to a customer review

## Notes

- Routing uses `HashRouter`, which also helps when deploying to static hosting.
- Legacy files under old cleanup-only paths were removed to match the current
  runtime structure.
- The main production risk left on the frontend is bundle size; route-based
  code splitting would be a good next optimization pass.
