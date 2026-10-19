const BASE_URL = 'http://localhost:3000';

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

async function runAuthFlowTests() {
  console.log('--- STARTING BILLFLOW AUTHENTICATION & SUPER ADMIN FLOW TESTS ---\n');

  // Step 1: Verify database connection & setup status endpoint
  console.log('1. Checking /api/auth/setup-status endpoint & database connectivity...');
  const setupStatusRes = await fetch(`${BASE_URL}/api/auth/setup-status`);
  assert(setupStatusRes.ok, `setup-status should return 200, got ${setupStatusRes.status}`);
  const setupStatus = await setupStatusRes.json();
  console.log('   setup-status result:', setupStatus);
  assert(typeof setupStatus.isSetupRequired === 'boolean', 'isSetupRequired must be a boolean');

  // Check if system already has a user or needs initialization
  const testAdminEmail = `superadmin-${Date.now()}@apexinfotech.in`;
  const testAdminPassword = `MasterSecretPass!${Date.now()}`;
  let authToken = '';

  if (setupStatus.isSetupRequired) {
    // Step 2: Register first Super Admin
    console.log('\n2. Testing First-time Super Admin Registration (/api/auth/setup)...');
    const setupRes = await fetch(`${BASE_URL}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Apex Super Admin',
        email: testAdminEmail,
        password: testAdminPassword,
        mfaEnabled: false,
      }),
    });

    assert(setupRes.ok, `Super Admin registration should return 201/200, got ${setupRes.status}`);
    const setupData = await setupRes.json();
    console.log('   Registration successful for user:', setupData.user.name, `(${setupData.user.email})`);
    assert(Boolean(setupData.token), 'Registration must return an authenticated session token');
    assertEqual(setupData.user.role, 'super_admin', 'Registered user must have super_admin role');
    assertEqual(setupData.user.status, 'active', 'User status must be active');
    authToken = setupData.token;

    // Step 3: Verify setup-status now returns isSetupRequired = false
    console.log('\n3. Verifying /api/auth/setup-status after Super Admin registration...');
    const postSetupStatusRes = await fetch(`${BASE_URL}/api/auth/setup-status`);
    const postSetupStatus = await postSetupStatusRes.json();
    assertEqual(postSetupStatus.isSetupRequired, false, 'isSetupRequired must now be false');
    assert(postSetupStatus.totalUsers >= 1, 'totalUsers must be at least 1');
    console.log('   ✓ System correctly detected Super Admin exists (isSetupRequired: false)');

    // Step 4: Verify duplicate initial setup is blocked
    console.log('\n4. Verifying secondary setup attempt is blocked...');
    const duplicateRes = await fetch(`${BASE_URL}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Intruder Admin',
        email: 'intruder@test.com',
        password: 'Password123!',
      }),
    });
    assertEqual(duplicateRes.status, 400, 'Duplicate setup must return 400 Bad Request');
    console.log('   ✓ Duplicate setup blocked with HTTP 400');
  } else {
    console.log('   Super Admin already configured in database.');
  }

  // Step 5: Test /api/auth/me with session token
  if (authToken) {
    console.log('\n5. Testing /api/auth/me profile & permission validation...');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    assert(meRes.ok, `GET /api/auth/me should succeed, got ${meRes.status}`);
    const meData = await meRes.json();
    assertEqual(meData.user.role, 'super_admin', 'Role must match');
    assert(meData.permissions.canManageUsers === true, 'Super Admin must have user management permissions');
    assert(meData.permissions.canEditSettings === true, 'Super Admin must have settings edit permissions');
    console.log('   ✓ Authenticated profile & Super Admin permissions verified');
  }

  // Step 6: Test Login with wrong password is rejected
  console.log('\n6. Testing Login with invalid credentials...');
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testAdminEmail,
      password: 'WrongPassword999!',
    }),
  });
  assertEqual(badLoginRes.status, 401, 'Invalid password must return 401');
  console.log('   ✓ Invalid credentials rejected with HTTP 401');

  // Step 7: Test Login with correct credentials
  if (authToken) {
    console.log('\n7. Testing Login with correct registered credentials...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdminEmail,
        password: testAdminPassword,
      }),
    });
    assert(loginRes.ok, `Login should succeed, got ${loginRes.status}`);
    const loginData = await loginRes.json();
    assert(Boolean(loginData.token), 'Login must return fresh session token');
    assertEqual(loginData.user.email, testAdminEmail, 'Logged-in user email must match');
    console.log('   ✓ Login successful! Fresh session token acquired.');
    authToken = loginData.token;
  }

  // Step 8: Verify access to protected business settings with token
  if (authToken) {
    console.log('\n8. Testing access to protected business settings (/api/settings)...');
    const settingsRes = await fetch(`${BASE_URL}/api/settings`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    assert(settingsRes.ok, `GET /api/settings should succeed with token, got ${settingsRes.status}`);
    const settings = await settingsRes.json();
    assert(Boolean(settings.businessName), 'Settings must contain businessName');
    console.log('   ✓ Business Settings accessed successfully:', settings.businessName);
  }

  // Step 9: Verify data preservation (customers, invoices, products)
  console.log('\n9. Verifying data preservation across business collections...');
  const custRes = await fetch(`${BASE_URL}/api/customers`);
  const customers = await custRes.json();
  const invRes = await fetch(`${BASE_URL}/api/invoices`);
  const invoices = await invRes.json();
  const prodRes = await fetch(`${BASE_URL}/api/products`);
  const products = await prodRes.json();

  assert(Array.isArray(customers) && customers.length > 0, 'Customers must be preserved');
  assert(Array.isArray(invoices) && invoices.length > 0, 'Invoices must be preserved');
  const prodCount = Array.isArray(products) ? products.length : (products.items ? products.items.length : 0);
  assert(prodCount > 0, 'Product catalog must be preserved');
  console.log(`   ✓ Data preserved: ${customers.length} customers, ${invoices.length} invoices, ${prodCount} products`);

  // Step 10: Test Logout & Session Invalidation
  if (authToken) {
    console.log('\n10. Testing Logout & session revocation...');
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    assert(logoutRes.ok, 'Logout endpoint must return 200');

    // Verify token is revoked
    const meAfterLogout = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    assertEqual(meAfterLogout.status, 401, 'Revoked token must be rejected with HTTP 401');
    console.log('   ✓ Session revoked successfully; subsequent calls rejected with 401');
  }

  console.log('\n--- ALL AUTHENTICATION & SUPER ADMIN LIFECYCLE TESTS PASSED! ---');
}

runAuthFlowTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
