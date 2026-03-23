#!/bin/bash

# Permission Workflow Frontend Setup Script

echo "📦 Installing Permission Workflow Components..."

# Create directories
mkdir -p src/components/PermissionWorkflow
mkdir -p src/services
mkdir -p src/types
mkdir -p app/admin/permissions/workflow

echo "✅ Directories created"

# List created files
echo ""
echo "📂 Created Files:"
echo "  Services:"
echo "    - src/services/permissionRequestService.ts"
echo ""
echo "  Types:"
echo "    - src/types/permissionWorkflow.ts"
echo ""
echo "  Components:"
echo "    - src/components/PermissionWorkflow/PendingRequestsList.tsx"
echo "    - src/components/PermissionWorkflow/CreatePermissionRequestForm.tsx"
echo "    - src/components/PermissionWorkflow/CreateRoleWithTemplateForm.tsx"
echo ""
echo "  Pages:"
echo "    - app/admin/permissions/workflow/page.tsx"
echo ""

echo "📋 Next Steps:"
echo "1. Ensure backend is running on http://localhost:4001"
echo "2. Navigate to http://localhost:3000/admin/permissions/workflow"
echo "3. Test the permission workflow UI"
echo "4. Import Postman collection: Parabellum-Permission-Workflow.postman_collection.json"
echo ""
echo "✨ Setup complete!"
