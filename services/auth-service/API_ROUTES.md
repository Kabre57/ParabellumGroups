# Auth Service - API Routes Documentation

## Base URL
`http://localhost:4001/api`

## Response Format
All responses follow this standardized format:
```json
{
  "success": true/false,
  "message": "Description message",
  "data": { ... },
  "errors": { ... }
}
```

---

## Authentication Routes (`/api/auth`)

### 1. Register User
**POST** `/api/auth/register`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "EMPLOYEE",
  "serviceId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### 2. Login
**POST** `/api/auth/login`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

### 3. Refresh Token
**POST** `/api/auth/refresh`

**Body:**
```json
{
  "refreshToken": "your-refresh-token"
}
```

### 4. Logout
**POST** `/api/auth/logout`

**Headers:** `Authorization: Bearer {token}`

### 5. Get Current User
**GET** `/api/auth/me`

**Headers:** `Authorization: Bearer {token}`

---

## User Routes (`/api/users`)

All routes require authentication.

### 1. Get All Users
**GET** `/api/users?page=1&limit=10&role=EMPLOYEE&search=john`

**Access:** ADMIN, GENERAL_DIRECTOR, SERVICE_MANAGER

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `role` (optional): Filter by role
- `serviceId` (optional): Filter by service
- `isActive` (optional): Filter by active status
- `search` (optional): Search term

### 2. Get User by ID
**GET** `/api/users/:id`

**Access:** Authenticated users

### 3. Update User
**PUT** `/api/users/:id`

**Access:** ADMIN, GENERAL_DIRECTOR

**Body:**
```json
{
  "email": "newemail@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "SERVICE_MANAGER",
  "serviceId": 2,
  "phone": "+1234567890",
  "position": "Team Lead"
}
```

### 4. Delete User
**DELETE** `/api/users/:id`

**Access:** ADMIN only

*Note: This is a soft delete (sets isActive to false)*

### 5. Update User Status
**PATCH** `/api/users/:id/status`

**Access:** ADMIN, GENERAL_DIRECTOR

**Body:**
```json
{
  "isActive": false
}
```

---

## Service Routes (`/api/services`)

All routes require authentication.

### 1. Get All Services
**GET** `/api/services`

**Access:** All authenticated users

### 2. Get Service by ID
**GET** `/api/services/:id`

**Access:** All authenticated users

### 3. Create Service
**POST** `/api/services`

**Access:** ADMIN, GENERAL_DIRECTOR

**Body:**
```json
{
  "name": "IT Department",
  "description": "Information Technology"
}
```

### 4. Update Service
**PUT** `/api/services/:id`

**Access:** ADMIN, GENERAL_DIRECTOR

**Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### 5. Delete Service
**DELETE** `/api/services/:id`

**Access:** ADMIN only

*Note: Cannot delete service with assigned users*

---

## Permission Routes (`/api/permissions`)

All routes require authentication.

### 1. Get All Permissions
**GET** `/api/permissions?category=users`

**Access:** ADMIN, GENERAL_DIRECTOR

**Query Parameters:**
- `category` (optional): Filter by category

### 2. Get Permission by ID
**GET** `/api/permissions/:id`

**Access:** ADMIN, GENERAL_DIRECTOR

### 3. Create Permission
**POST** `/api/permissions`

**Access:** ADMIN only

**Body:**
```json
{
  "name": "users.manage",
  "description": "Manage users",
  "category": "users"
}
```

### 4. Update Permission
**PUT** `/api/permissions/:id`

**Access:** ADMIN only

**Body:**
```json
{
  "name": "users.manage",
  "description": "Updated description",
  "category": "users"
}
```

### 5. Delete Permission
**DELETE** `/api/permissions/:id`

**Access:** ADMIN only

### 6. Get Role Permissions
**GET** `/api/permissions/roles/:role`

**Access:** ADMIN, GENERAL_DIRECTOR

**Example:** `/api/permissions/roles/SERVICE_MANAGER`

### 7. Update Role Permission
**PUT** `/api/permissions/roles/:role/:permissionId`

**Access:** ADMIN only

**Body:**
```json
{
  "canView": true,
  "canCreate": true,
  "canEdit": true,
  "canDelete": false,
  "canApprove": true
}
```

### 8. Delete Role Permission
**DELETE** `/api/permissions/roles/:role/:permissionId`

**Access:** ADMIN only

---

## User Roles

- `ADMIN` - Full system access
- `GENERAL_DIRECTOR` - Executive level access
- `SERVICE_MANAGER` - Department manager access
- `EMPLOYEE` - Basic employee access
- `ACCOUNTANT` - Accounting specific access
- `PURCHASING_MANAGER` - Purchasing specific access

---

## Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized / Invalid Token
- `403` - Forbidden / Insufficient Permissions
- `404` - Not Found
- `409` - Conflict / Duplicate Entry
- `500` - Internal Server Error

---

## Headers

All authenticated requests must include:
```
Authorization: Bearer {your-jwt-token}
Content-Type: application/json
```

---

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
