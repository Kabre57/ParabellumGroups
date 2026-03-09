# Permission Workflow - Testing Guide

## Quick Start Test Cases

### 1️⃣ Test Case: Create and Approve Permission Change

**Objective**: Verify the complete workflow from request creation to approval

#### Prerequisites
- Backend running on `http://localhost:4001`
- Frontend running on `http://localhost:3000`
- Admin user logged in
- Database migrated with new schema

#### Steps

**Step 1: Create a Permission Change Request**

Using Postman or cURL:
```bash
curl -X POST http://localhost:4001/api/permission-requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": 2,
    "permissionId": 10,
    "canView": true,
    "canCreate": true,
    "reason": "Employee needs reporting access"
  }'
```

Expected Response (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "roleId": 2,
    "permissionId": 10,
    "status": "PENDING",
    "requestedBy": 1,
    "requestedAt": "2026-03-05T16:30:00Z",
    "canView": true,
    "canCreate": true
  }
}
```

**Step 2: View Pending Requests in Frontend**

Navigate to: `http://localhost:3000/admin/permissions/workflow`
- Tab: "Pending Approvals"
- You should see your newly created request
- Display shows: Role, Permission, Requester, Requested Date
- Action buttons visible: "✓ Approve" and "✗ Reject"

**Step 3: Approve the Request**

Click "✓ Approve" button

Success Indicator:
- Green toast notification: "Request approved successfully"
- Request disappears from pending list
- Entry now visible in "Approved" filter

**Step 4: Verify Permission Applied**

Check role permissions:
```bash
curl http://localhost:4001/api/permissions/roles/2 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Permission #10 should now have `canView: true, canCreate: true`

#### Expected Outcome: ✅ PASS

---

### 2️⃣ Test Case: Create Role with Template

**Objective**: Verify template application during role creation

#### Steps

**Step 1: Create Role with SERVICE_MANAGER Template**

Using Postman:
```http
POST http://localhost:4001/api/roles
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "name": "Team Lead",
  "code": "TEAM_LEAD",
  "description": "Team leadership role",
  "template": "SERVICE_MANAGER",
  "isActive": true
}
```

Expected Response (201):
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "id": 10,
    "name": "Team Lead",
    "code": "TEAM_LEAD",
    "isSystem": false,
    "isActive": true
  }
}
```

**Step 2: Verify Template Permissions Applied**

```bash
curl http://localhost:4001/api/permissions/roles/TEAM_LEAD \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "roleId": 10,
      "permissionId": 2,
      "permission": {
        "name": "dashboard.view",
        "category": "dashboard"
      }
    },
    // ... multiple permissions based on SERVICE_MANAGER template
  ]
}
```

**Count**: Should have 15-25 permissions automatically assigned

#### Expected Outcome: ✅ PASS

---

### 3️⃣ Test Case: Reject with Reason

**Objective**: Verify rejection workflow and notification

#### Steps

**Step 1: Create a Problem Request**
```bash
curl -X POST http://localhost:4001/api/permission-requests \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": 2,
    "permissionId": 50,
    "canDelete": true,
    "reason": "Need delete access for cleanup"
  }'
```

Note the request ID from response (e.g., `id: 2`)

**Step 2: Reject in Frontend**

Navigate to pending requests and click "✗ Reject"
- Dialog appears asking for rejection reason
- Enter: "Delete permission requires security clearance"
- Confirm

**Step 3: Verify Rejection**

Backend log should show notification:
```
Notify admin: Role permission rejected for role 2 / permission 50
```

**Step 4: Check Audit Log**

```bash
curl http://localhost:4001/api/audit-logs?entityType=PermissionChangeRequest \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected entry:
```json
{
  "action": "ROLE_PERMISSION_REJECTED",
  "entityType": "PermissionChangeRequest",
  "details": "Request #2 rejected",
  "level": "CRITICAL",
  "userId": 1,
  "createdAt": "2026-03-05T16:35:00Z"
}
```

#### Expected Outcome: ✅ PASS

---

### 4️⃣ Test Case: Enforce Workflow Mode

**Objective**: Verify workflow enforcement prevents direct updates

#### Prerequisites
Set environment variable:
```bash
export ENFORCE_PERMISSION_WORKFLOW=true
# Restart backend
```

#### Steps

**Step 1: Try Direct Update (Should Fail)**

```bash
curl -X PUT http://localhost:4001/api/permissions/roles/EMPLOYEE/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "canView": true
  }'
```

Expected Response (403):
```json
{
  "success": false,
  "message": "Direct updates are disabled; please submit a permission change request"
}
```

**Step 2: Use Workflow Instead**

```bash
# Must use the request workflow
curl -X POST http://localhost:4001/api/permission-requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": 2,
    "permissionId": 1,
    "canView": true,
    "reason": "Required workflow"
  }'
```

Expected Response (201): Request created successfully

#### Expected Outcome: ✅ PASS

---

### 5️⃣ Test Case: Frontend Form Validation

**Objective**: Verify frontend form handles errors gracefully

#### Steps

**Step 1: Submit Empty Form**

Navigate to `http://localhost:3000/admin/permissions/workflow`
- Tab: "Request Change"
- Click "Submit for Approval" without filling fields

Expected:
- Error message: "Please select both role and permission"
- Form remains open
- No API call made

**Step 2: Select Role but No Permission**

- Select a role: "Employé"
- Leave permission empty
- Click "Submit for Approval"

Expected:
- Error message: "Please select both role and permission"

**Step 3: Fill Form Correctly**

- Select Role: "Employé"
- Select Permission: "dashboard.view"
- Check "canView" checkbox
- Click "Submit for Approval"

Expected:
- Green toast: "Request created successfully and sent for approval!"
- Form resets
- User redirected to "Pending Approvals" tab after 1.5s

#### Expected Outcome: ✅ PASS

---

### 6️⃣ Test Case: Postman Collection Full Flow

**Objective**: Verify all Postman requests work correctly

#### Setup
1. Import `Parabellum-Permission-Workflow.postman_collection.json` in Postman
2. Set variables:
   - `{{baseUrl}}`: `http://localhost:4001/api`
   - `{{bearerToken}}`: Obtain from Login endpoint

#### Run in Order

1. **[Auth] Login**
   - Copy token from response
   - Set `{{bearerToken}}` to this value

2. **[Roles] List All Roles**
   - Should return array of roles (ADMIN, EMPLOYEE, etc.)

3. **[Roles] Create Role WITH Template**
   - Name: "Quality Manager"
   - Code: "QA_MANAGER"
   - Template: "SERVICE_MANAGER"
   - Expected: 201, role created with permissions auto-assigned

4. **[Permissions] List Permissions by Category**
   - Filter: `category=users`
   - Should return all user-related permissions

5. **[Permission-Requests] Create Request**
   - RoleId: 2
   - PermissionId: 15
   - Expected: 201, request in PENDING status

6. **[Permission-Requests] List Pending**
   - Should return your request with status PENDING

7. **[Permission-Requests] Approve**
   - RequestId: from step 5
   - Expected: 200, status changed to APPROVED

8. **[Audit-Logs] Get Audit Logs**
   - Should show ROLE_PERMISSION_APPROVED entry
   - Verify userId, timestamp, etc.

#### Expected Outcome: ✅ PASS (All 8 requests succeed)

---

## 🧪 Automated Test Script

```typescript
// integration.test.ts - Example test suite
describe('Permission Workflow', () => {
  
  test('should create and approve permission change', async () => {
    // 1. Create request
    const createRes = await fetch('http://localhost:4001/api/permission-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        roleId: 2,
        permissionId: 10,
        canView: true
      })
    });
    expect(createRes.status).toBe(201);
    const request = await createRes.json();
    
    // 2. Approve request
    const approveRes = await fetch(
      `http://localhost:4001/api/permission-requests/${request.data.id}/approve`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    expect(approveRes.status).toBe(200);
    const approved = await approveRes.json();
    expect(approved.data.status).toBe('APPROVED');
  });

  test('should apply template to role', async () => {
    const res = await fetch('http://localhost:4001/api/roles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Manager',
        code: 'MANAGER',
        template: 'SERVICE_MANAGER'
      })
    });
    expect(res.status).toBe(201);
    
    // Verify permissions applied
    const permsRes = await fetch('http://localhost:4001/api/permissions/roles/MANAGER', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const perms = await permsRes.json();
    expect(perms.data.length).toBeGreaterThan(10);
  });

  test('should reject with 403 when workflow enforced', async () => {
    process.env.ENFORCE_PERMISSION_WORKFLOW = 'true';
    
    const res = await fetch('http://localhost:4001/api/permissions/roles/ADMIN/1', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ canView: true })
    });
    expect(res.status).toBe(403);
  });
});
```

---

## 📊 Test Coverage

| Feature | Unit | Integration | E2E |
|---------|------|-------------|-----|
| Create Request | ✅ | ✅ | ✅ |
| Approve Request | ✅ | ✅ | ✅ |
| Reject Request | ✅ | ✅ | ✅ |
| Apply Template | ✅ | ✅ | ✅ |
| Enforce Workflow | ✅ | ✅ | ✅ |
| Audit Logging | ✅ | ✅ | ✅ |
| Notifications | ⚠️ | ✅ | 🔄 |
| Frontend Forms | ✅ | ✅ | ✅ |

---

## ✅ Success Criteria

- [ ] All Postman requests return expected status codes
- [ ] Frontend forms submit and display correct feedback
- [ ] Requests transition through PENDING → APPROVED/REJECTED
- [ ] Templates auto-apply 15+ permissions
- [ ] Audit logs record all actions
- [ ] Workflow enforcement blocks direct updates when enabled
- [ ] Notifications trigger (check console logs)
- [ ] Database audit_logs table populated

---

**Test Date**: ___________  
**Tester**: ___________  
**Result**: ☐ PASS ☐ FAIL  
**Notes**: ___________________________________________
