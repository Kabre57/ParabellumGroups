/**
 * Quick manual tests for Auth Service
 * Run these with a tool like Postman or curl after starting the service
 */

const BASE_URL = 'http://localhost:4001/api';

// Test data
const testUser = {
  email: 'admin@parabellum.com',
  password: 'Admin123!',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN'
};

/**
 * Manual Test Checklist:
 * 
 * 1. Health Check
 *    GET http://localhost:4001/api/health
 * 
 * 2. Register User
 *    POST http://localhost:4001/api/auth/register
 *    Body: {
 *      "email": "admin@parabellum.com",
 *      "password": "Admin123!",
 *      "firstName": "Admin",
 *      "lastName": "User",
 *      "role": "ADMIN"
 *    }
 * 
 * 3. Login
 *    POST http://localhost:4001/api/auth/login
 *    Body: {
 *      "email": "admin@parabellum.com",
 *      "password": "Admin123!"
 *    }
 *    Save the accessToken from response
 * 
 * 4. Get Current User
 *    GET http://localhost:4001/api/auth/me
 *    Headers: Authorization: Bearer {accessToken}
 * 
 * 5. Create Service
 *    POST http://localhost:4001/api/services
 *    Headers: Authorization: Bearer {accessToken}
 *    Body: {
 *      "name": "IT Department",
 *      "description": "Information Technology"
 *    }
 * 
 * 6. Get All Services
 *    GET http://localhost:4001/api/services
 *    Headers: Authorization: Bearer {accessToken}
 * 
 * 7. Get All Users
 *    GET http://localhost:4001/api/users
 *    Headers: Authorization: Bearer {accessToken}
 * 
 * 8. Create Permission
 *    POST http://localhost:4001/api/permissions
 *    Headers: Authorization: Bearer {accessToken}
 *    Body: {
 *      "name": "users.view",
 *      "description": "View users",
 *      "category": "users"
 *    }
 * 
 * 9. Get All Permissions
 *    GET http://localhost:4001/api/permissions
 *    Headers: Authorization: Bearer {accessToken}
 * 
 * 10. Update Role Permission
 *     PUT http://localhost:4001/api/permissions/roles/SERVICE_MANAGER/1
 *     Headers: Authorization: Bearer {accessToken}
 *     Body: {
 *       "canView": true,
 *       "canCreate": false,
 *       "canEdit": false,
 *       "canDelete": false,
 *       "canApprove": false
 *     }
 */

// cURL Examples:

// 1. Health Check
// curl http://localhost:4001/api/health

// 2. Register
// curl -X POST http://localhost:4001/api/auth/register \
//   -H "Content-Type: application/json" \
//   -d '{"email":"admin@parabellum.com","password":"Admin123!","firstName":"Admin","lastName":"User","role":"ADMIN"}'

// 3. Login
// curl -X POST http://localhost:4001/api/auth/login \
//   -H "Content-Type: application/json" \
//   -d '{"email":"admin@parabellum.com","password":"Admin123!"}'

// 4. Get Current User (replace TOKEN with actual token)
// curl http://localhost:4001/api/auth/me \
//   -H "Authorization: Bearer TOKEN"

// 5. Create Service (replace TOKEN with actual token)
// curl -X POST http://localhost:4001/api/services \
//   -H "Authorization: Bearer TOKEN" \
//   -H "Content-Type: application/json" \
//   -d '{"name":"IT Department","description":"Information Technology"}'

module.exports = {
  BASE_URL,
  testUser,
};
