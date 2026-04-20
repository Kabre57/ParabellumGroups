const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'services', 'billing-service', 'controllers', 'accountingOverview.controller.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find the start and end of the orphaned block
// The block starts roughly at "        {" just before "/* id: 'account-512',"
// And ends at "    }" just before "const dynamicAccounts = evaluatedDynamicAccounts;"

const startIdx = content.indexOf("        {\r\n          /* id: 'account-512',") !== -1 
  ? content.indexOf("        {\r\n          /* id: 'account-512',") 
  : content.indexOf("        {\n          /* id: 'account-512',");

const endMarker = "const dynamicAccounts = evaluatedDynamicAccounts;";
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx);
    
    fs.writeFileSync(filePath, before + after, 'utf8');
    console.log('✅ Syntax error successfully removed in accountingOverview.controller.js');
} else {
    // Fallback if the strict string didn't match
    console.error('⚠️ Precise markers not found, attempting regex cleanup...');
    const regex = /^[ \t]*\{[\s\S]*?\/\* id: 'account-512',[\s\S]*?\];\s*\}/m;
    const newContent = content.replace(regex, '');
    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('✅ Syntax error successfully removed using REGEX in accountingOverview.controller.js');
    } else {
        console.error('❌ Could not find the code block to remove.');
    }
}
