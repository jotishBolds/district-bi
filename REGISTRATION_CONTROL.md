# Registration Control Documentation

## Overview

User registration has been disabled by default for security purposes. This document explains how to control registration access.

## How Registration is Blocked

### 1. Environment Variable Control

Registration is controlled by the `ENABLE_REGISTRATION` environment variable:

- `ENABLE_REGISTRATION="true"` - Enables registration
- `ENABLE_REGISTRATION="false"` or not set - Disables registration

### 2. Multiple Blocking Layers

#### API Route Protection (`/app/api/auth/register/route.ts`)

- GET requests return 403 status when registration is disabled
- POST requests return 403 status when registration is disabled

#### Middleware Protection (`/middleware.ts`)

- Redirects `/register` route to login page when registration is disabled
- Adds query parameter `?message=registration-disabled` to login URL

#### Frontend Protection (`/app/(auth)/register/page.tsx`)

- Checks registration status via API call
- Shows blocked message if registration is disabled
- Provides navigation back to login or home

## How to Enable Registration

### For Development

1. Create a `.env.local` file in the project root (if it doesn't exist)
2. Add the following line:
   ```
   ENABLE_REGISTRATION="true"
   ```
3. Restart your development server:
   ```bash
   npm run dev
   ```

### For Production

1. Set the environment variable in your deployment platform:
   ```
   ENABLE_REGISTRATION="true"
   ```
2. Redeploy or restart your application

## Security Recommendations

### Production Environment

- **Always keep registration disabled** in production: `ENABLE_REGISTRATION="false"`
- Only enable temporarily when you need to add new users
- Disable immediately after adding users

### Development Environment

- Enable registration only when testing registration functionality
- Consider using seed scripts instead of manual registration for test data

## Files Modified

1. `/app/api/auth/register/route.ts` - API route protection
2. `/middleware.ts` - Route-level blocking
3. `/app/(auth)/register/page.tsx` - Frontend blocking with user feedback
4. `/.env.example` - Environment variable documentation
5. `/app/(super-admin)/admin/frontdesk-management/page.tsx` - Fixed to use admin API instead of public registration

## Admin User Creation

Admin functions for creating users are **NOT affected** by the registration blocking:

- User Management (`/app/(super-admin)/admin/user-management/page.tsx`) uses `/api/admin/users`
- Frontdesk Management (`/app/(super-admin)/admin/frontdesk-management/page.tsx`) uses `/api/admin/users`
- Temp Admin Creation uses `/api/admin/create-temp-admin`

These admin endpoints have their own authorization checks and work independently of the `ENABLE_REGISTRATION` setting.

## Testing the Block

1. Ensure `ENABLE_REGISTRATION` is not set to "true"
2. Try visiting `/register` - should redirect to login
3. Try POST to `/api/auth/register` - should return 403 error
4. Login page should show appropriate message if redirected from blocked register

## Emergency Access

If you need to create admin users when registration is blocked:

1. Use database direct access to create users
2. Use seed scripts in `/scripts/` directory
3. Temporarily enable registration, create user, then disable again
