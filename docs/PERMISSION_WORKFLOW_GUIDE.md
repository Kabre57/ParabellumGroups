# Permission Workflow - Complete Integration Guide

## 📋 Overview

The permission workflow system provides:
- **Role Templates**: Predefined permission sets for common roles
- **Change Approval Process**: All permission changes require administrator approval
- **Audit Logging**: Complete history of all changes
- **Notifications**: Automatic alerts to stakeholders

---

## 🎯 Backend Implementation

### Schema Changes
The new `PermissionChangeRequest` model tracks all permission changes:

```prisma
model PermissionChangeRequest {
  id            Int      @id @default(autoincrement())
  roleId        Int
  permissionId  Int
  status        String   @default("PENDING") // PENDING, APPROVED, REJECTED
  requestedBy   Int      @map("requested_by")
  requestedAt   DateTime @default(now())
  reviewedBy    Int?     @map("reviewed_by")
  reviewedAt    DateTime?
  reason        String?
  canView       Boolean?
  canCreate     Boolean?
  canEdit       Boolean?
  canDelete     Boolean?
  canApprove    Boolean?
  
  role          Role     @relation(...)
  permission    Permission @relation(...)
  requester     User     @relation("Requester", ...)
  reviewer      User?    @relation("Reviewer", ...)
}
```

### API Endpoints

#### Permission Change Requests

```http
# List all requests or filter by status
GET /api/permission-requests?status=PENDING
GET /api/permission-requests?status=APPROVED
GET /api/permission-requests?status=REJECTED

# Create a new change request
POST /api/permission-requests
{
  "roleId": 2,
  "permissionId": 15,
  "canView": true,
  "canCreate": true,
  "canEdit": false,
  "canDelete": false,
  "canApprove": false,
  "reason": "Optional reason for the request"
}

# Approve a request (Admin/General Director only)
PATCH /api/permission-requests/:id/approve

# Reject a request with optional reason
PATCH /api/permission-requests/:id/reject
{
  "reason": "Does not align with security policy"
}
```

#### Role Creation with Templates

```http
# Create a role with a predefined template
POST /api/roles
{
  "name": "Manager",
  "code": "MANAGER",
  "description": "Service Manager",
  "template": "SERVICE_MANAGER"  # Optional - applies predefined permissions
}

# Available templates:
# - ADMIN: Full system access
# - EMPLOYEE: Standard employee access
# - SERVICE_MANAGER: Manager-level permissions
# - GENERAL_DIRECTOR: Director permissions
```

---

## 🖥️ Frontend Implementation

### Components

#### 1. **PendingRequestsList** Component
Displays all pending approval requests with action buttons.

```tsx
import { PendingRequestsList } from '@/components/PermissionWorkflow/PendingRequestsList';

// In your page:
<PendingRequestsList />
```

**Features:**
- Lists pending permission change requests
- Shows role, permission, and requester info
- Approve/Reject buttons with inline decision-making
- Real-time status updates

#### 2. **CreatePermissionRequestForm** Component
Form to submit new permission change requests.

```tsx
import { CreatePermissionRequestForm } from '@/components/PermissionWorkflow/CreatePermissionRequestForm';

// In your page:
<CreatePermissionRequestForm 
  roles={rolesList}
  permissions={permissionsList}
  onSuccess={() => navigateToPending()}
/>
```

**Features:**
- Role and permission selection dropdowns
- Checkbox matrix for granular permission control
- Optional reason/justification field
- Success/error feedback

#### 3. **PermissionWorkflow Page** (Admin Dashboard)
Complete management interface at `/admin/permissions/workflow`

```tsx
// Route: app/admin/permissions/workflow/page.tsx
export default function PermissionWorkflowPage() {
  // Two tabs:
  // 1. Pending Approvals - view and approve/reject requests
  // 2. Request Change - submit new permission change requests
}
```

---

## 📮 Service Layer

### Permission Request Service

```typescript
import { permissionRequestService } from '@/services/permissionRequestService';

// List pending requests
const pending = await permissionRequestService.getPendingRequests();

// Create a request
const request = await permissionRequestService.createRequest({
  roleId: 2,
  permissionId: 15,
  canView: true,
  reason: 'For daily reporting'
});

// Approve/Reject
await permissionRequestService.approveRequest(requestId);
await permissionRequestService.rejectRequest(requestId, 'Security review pending');
```

---

## 🧪 Testing with Postman

### Import the Collection

1. Download: `Parabellum-Permission-Workflow.postman_collection.json`
2. In Postman: **Import** → **Select file**
3. Configure variables:
   - `baseUrl`: `http://localhost:4001/api`
   - `bearerToken`: Your JWT token from login

### Test Scenarios

#### Scenario 1: Create and Approve a Request

```
1. POST /auth/login
   → Get bearerToken (save to variable)

2. POST /permission-requests
   → Create a change request for EMPLOYEE role + reports.create
   → Note the request ID

3. PATCH /permission-requests/:id/approve
   → Role permissions are updated
   → Requester receives notification
```

#### Scenario 2: Create Role with Template

```
1. POST /roles (with template: SERVICE_MANAGER)
   → Role is created
   → All SERVICE_MANAGER template permissions are auto-assigned

2. GET /permissions/roles/SERVICE_MANAGER
   → Verify all permissions were applied
```

#### Scenario 3: Enforce Workflow (Optional)

Set environment variable:
```bash
export ENFORCE_PERMISSION_WORKFLOW=true
```

Then:
```
1. Try direct PUT /permissions/roles/ADMIN/1
   → Returns 403 Forbidden
   
2. Must use POST /permission-requests instead
   → Requires approval before change takes effect
```

---

## 🔄 Workflow Flow Diagram

```
User submits request
       ↓
POST /permission-requests
       ↓
Request stored as PENDING
       ↓
Notification sent to admins
       ↓
Admin reviews in UI
       ↓
    ├─ APPROVE → permissions updated → notification sent
    │
    └─ REJECT → request rejected → notification sent
       
All actions logged to audit_logs
```

---

## 📊 Frontend Pages

### Navigation
```
Admin Dashboard
├── Users
├── Roles
├── Permissions
└── Permission Management (NEW)
    ├── Pending Approvals
    └── Request Change
```

### UI Layout

```
┌─────────────────────────────────────┐
│  Permission Management              │
├────────────────┬────────────────────┤
│ Pending Approvals | Request Change   │  ← Tabs
├─────────────────────────────────────┤
│                                       │
│  Pending requests (if tab = pending) │
│  ├─ Request #1 from user@email       │
│  │  Role: EMPLOYEE                   │
│  │  Permission: reports.create       │
│  │  [✓ Approve] [✗ Reject]           │
│  │                                    │
│  └─ Request #2 from admin@email      │
│     Role: SERVICE_MANAGER            │
│     Permission: users.read_all       │
│     [✓ Approve] [✗ Reject]           │
│                                       │
│  OR                                  │
│                                       │
│  Form to create new request (if tab) │
│  Select Role: [dropdown]             │
│  Select Permission: [dropdown]       │
│  Permissions: [☐View ☐Create ...]   │
│  Reason: [text area]                 │
│  [Submit for Approval]               │
│                                       │
└─────────────────────────────────────┘
```

---

## 🔔 Notifications (Stub Implementation)

Currently logs to console. To integrate with real notifications:

**File:** `src/services/notificationService.js`

Replace with:
- **Email**: Nodemailer / SendGrid
- **Slack**: Slack SDK
- **In-app**: Database notification table + WebSocket

```javascript
// Example - Email notification
async function notifyUser(userId, message) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  await sendEmail(user.email, 'Permission Change Notification', message);
}

// Example - Slack notification
async function notifyAdmins(message) {
  await posting to Slack webhook with message;
}
```

---

## 🚀 Deployment Checklist

- [ ] Database migration applied: `npx prisma migrate deploy`
- [ ] Backend environment variable set (optional): `ENFORCE_PERMISSION_WORKFLOW=true`
- [ ] Seeds executed: `node prisma/seed.js && node prisma/seed-complete-permissions.js`
- [ ] Frontend components deployed to `/admin/permissions/workflow`
- [ ] Notifications service configured (email/Slack/etc.)
- [ ] Admin users trained on approval workflow
- [ ] Audit logs endpoint accessible for compliance

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Guide](https://nextjs.org/docs)
- [REST API Best Practices](https://restfulapi.net)
- [PostMan Collections](https://learning.postman.com/docs/getting-started/creating-the-first-collection)

---

## ❓ FAQ

**Q: What if I want to disable the workflow temporarily?**
A: Remove or unset `ENFORCE_PERMISSION_WORKFLOW=true`. Direct API calls will then be allowed.

**Q: Can users create permission requests for themselves?**
A: Yes, any authenticated user can submit a request. Approval is always required.

**Q: How long are audit logs retained?**
A: Currently indefinite. Add a cleanup job to archive old logs if needed.

**Q: Can I customize role templates?**
A: Yes, edit `src/utils/roleTemplates.js` to modify predefined templates.

**Q: How do I notify users outside the system?**
A: Implement email/Slack integration in `src/services/notificationService.js`.

---

**Last Updated:** March 5, 2026  
**Version:** 1.0.0
