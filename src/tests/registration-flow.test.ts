const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.TEST_BASE_URL || `http://localhost:${PORT}`;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Failed [${message}]: Expected ${expected}, got ${actual}`);
  }
}

async function runRegistrationFlowTests() {
  console.log('--- STARTING BILLFLOW REGISTRATION & RBAC INTEGRATION TESTS ---\n');

  // Step 1: Check server availability and acquire Super Admin token
  console.log('1. Verifying setup-status and logging in as Super Admin...');
  const statusRes = await fetch(`${BASE_URL}/api/auth/setup-status`);
  assert(statusRes.ok, `Setup status failed: ${statusRes.status}`);
  const statusData = await statusRes.json();
  assert(statusData.initialized === true || statusData.hasSuperAdmin === true, 'System must be initialized with Super Admin');

  const adminEmail = statusData.superAdminEmail || 'admin@test.com';
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: 'Password123!' }),
  });

  assert(adminLoginRes.ok, `Admin login failed: ${adminLoginRes.status}`);
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;
  console.log('   ✓ Super Admin authenticated:', adminData.user.email);

  // Step 2: Validate registration rejects invalid data
  console.log('\n2. Testing registration validation on malformed inputs...');
  const shortPassRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'valid@example.com', password: '123' }),
  });
  assertEqual(shortPassRes.status, 400, 'Short password must return 400');
  console.log('   ✓ Short password rejected with 400');

  const invalidEmailRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'not-an-email', password: 'Password123!' }),
  });
  assertEqual(invalidEmailRes.status, 400, 'Invalid email must return 400');
  console.log('   ✓ Malformed email rejected with 400');

  // Step 3: Register a new legitimate user
  const regTimestamp = Date.now();
  const testEmail = `employee-${regTimestamp}@apexinfotech.in`;
  const testPassword = 'SecurePassword123!';
  const testName = `Ramesh Patel ${regTimestamp}`;

  console.log('\n3. Testing public user registration (/api/auth/register)...');
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
    }),
  });

  assertEqual(regRes.status, 201, `Registration must return 201 Created, got ${regRes.status}`);
  const regData = await regRes.json();
  console.log('   Registration response:', regData.message);
  assertEqual(regData.success, true, 'Registration success flag must be true');
  assertEqual(regData.approvalRequired, true, 'Default registration must require administrator approval');
  assertEqual(regData.user.role, 'employee', 'Public registration MUST always assign employee role');
  assertEqual(regData.user.status, 'pending_approval', 'User status must be pending_approval');
  assert(!regData.user.passwordHash, 'User password hash must NEVER be exposed in response');
  assert(!regData.user.passwordSalt, 'User password salt must NEVER be exposed in response');
  console.log('   ✓ User registered with restricted role "employee" and status "pending_approval"');

  // Step 4: Duplicate registration prevention
  console.log('\n4. Verifying duplicate email rejection...');
  const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate User',
      email: testEmail,
      password: 'AnotherPassword123!',
    }),
  });
  assertEqual(dupRes.status, 409, `Duplicate email registration must return 409 Conflict, got ${dupRes.status}`);
  const dupData = await dupRes.json();
  assertEqual(dupData.code, 'EMAIL_ALREADY_EXISTS', 'Expected EMAIL_ALREADY_EXISTS error code');
  console.log('   ✓ Duplicate email rejected with HTTP 409 Conflict');

  // Step 5: Verify login is blocked while pending approval
  console.log('\n5. Verifying login is blocked while account is pending approval...');
  const pendingLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  assertEqual(pendingLoginRes.status, 403, `Pending user login must be blocked with 403, got ${pendingLoginRes.status}`);
  const pendingLoginData = await pendingLoginRes.json();
  assertEqual(pendingLoginData.code, 'ACCOUNT_PENDING_APPROVAL', 'Expected ACCOUNT_PENDING_APPROVAL code');
  console.log('   ✓ Login blocked with HTTP 403:', pendingLoginData.error);

  // Step 6: Super Admin reviews and approves the user
  console.log('\n6. Super Admin reviewing user list and approving account...');
  const usersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(usersRes.ok, `Failed to fetch users list: ${usersRes.status}`);
  const usersList = await usersRes.json();
  const registeredUser = usersList.find((u: any) => u.email.toLowerCase() === testEmail.toLowerCase());
  assert(Boolean(registeredUser), 'Registered user must appear in Super Admin user list');
  assertEqual(registeredUser.status, 'pending_approval', 'User status in list must be pending_approval');

  // Approve the user
  const approveRes = await fetch(`${BASE_URL}/api/users/${registeredUser.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'active' }),
  });
  assert(approveRes.ok, `User approval failed: ${approveRes.status}`);
  const approvedData = await approveRes.json();
  assertEqual(approvedData.status, 'active', 'User status must now be active');
  console.log('   ✓ Super Admin successfully approved user account');

  // Step 7: Approved employee logs in
  console.log('\n7. Testing employee login after administrator approval...');
  const approvedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  assert(approvedLoginRes.ok, `Approved user login should return 200, got ${approvedLoginRes.status}`);
  const employeeSession = await approvedLoginRes.json();
  assert(Boolean(employeeSession.token), 'Session token must be provided');
  assertEqual(employeeSession.user.role, 'employee', 'User role must be employee');
  console.log('   ✓ Employee logged in successfully with token');

  // Step 8: Verify employee permissions & RBAC protection
  console.log('\n8. Verifying RBAC protection for employee role...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${employeeSession.token}` },
  });
  assert(meRes.ok, `Failed to fetch me profile: ${meRes.status}`);
  const meData = await meRes.json();
  assertEqual(meData.permissions.canManageUsers, false, 'Employee must NOT have canManageUsers permission');
  assertEqual(meData.permissions.canEditSettings, false, 'Employee must NOT have canEditSettings permission');
  assertEqual(meData.permissions.canDeleteRecords, false, 'Employee must NOT have canDeleteRecords permission');
  console.log('   ✓ Verified employee has restricted, non-admin permissions');

  // Step 9: Employee attempting Super Admin route (/api/users) is blocked
  console.log('\n9. Testing employee attempt to access /api/users...');
  const forbiddenUsersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${employeeSession.token}` },
  });
  assertEqual(forbiddenUsersRes.status, 403, `Employee accessing /api/users must return 403 Forbidden, got ${forbiddenUsersRes.status}`);
  console.log('   ✓ Forbidden endpoint blocked with HTTP 403');

  console.log('\n--- ALL REGISTRATION & RBAC TESTS PASSED SUCCESSFULLY! ---');
}

runRegistrationFlowTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
