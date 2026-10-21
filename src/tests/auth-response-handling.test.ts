import http from 'http';
import { api } from '../services/api';

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

async function runAuthResponseHandlingTests() {
  console.log('--- STARTING BILLFLOW AUTH & FETCH RESPONSE-HANDLING TEST SUITE ---\n');

  // Create a mock HTTP server to simulate various server/proxy behaviors
  let mockServerResponse: {
    status: number;
    headers: Record<string, string>;
    body: string;
  } = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true }),
  };

  const server = http.createServer((req, res) => {
    res.writeHead(mockServerResponse.status, mockServerResponse.headers);
    res.end(mockServerResponse.body);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as { port: number };
  const mockBaseUrl = `http://127.0.0.1:${address.port}/api`;
  api.setBaseUrl(mockBaseUrl);

  try {
    // ------------------------------------------------------------------------
    // Test 1: Successful JSON response
    // ------------------------------------------------------------------------
    console.log('1. Testing successful JSON response parsing...');
    mockServerResponse = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'test-token-123', user: { email: 'admin@test.com' } }),
    };

    const successRes = await api.login({ email: 'admin@test.com', password: 'Password123!' });
    assert('token' in successRes && successRes.token === 'test-token-123', 'Must parse JSON token');
    console.log('   ✓ Successful JSON response parsed correctly');

    // ------------------------------------------------------------------------
    // Test 2: Invalid credentials (401 JSON error with structured message)
    // ------------------------------------------------------------------------
    console.log('\n2. Testing invalid credentials response (HTTP 401 with structured JSON error)...');
    mockServerResponse = {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid email or password.' }),
    };

    try {
      await api.login({ email: 'admin@test.com', password: 'WrongPassword' });
      assert(false, 'Should have thrown error on 401');
    } catch (err: any) {
      assert(!err.message.includes('body stream already read'), 'Must NOT throw body stream already read');
      assert(!err.message.includes('Body has already been consumed'), 'Must NOT throw body already consumed');
      assertEqual(err.message, 'Invalid email or password.', 'Must preserve server error message');
      assertEqual(err.status, 401, 'Must attach HTTP status 401 to error object');
      assertEqual(err.data?.error, 'Invalid email or password.', 'Must preserve parsed err.data');
      console.log('   ✓ Server 401 error message preserved without body stream error');
    }

    // ------------------------------------------------------------------------
    // Test 3: Reverse proxy / server error returning HTML (e.g., 502 Bad Gateway)
    // ------------------------------------------------------------------------
    console.log('\n3. Testing server/proxy error returning HTML (HTTP 502 HTML document)...');
    mockServerResponse = {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
      body: '<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head><body><center><h1>502 Bad Gateway</h1></center><hr><center>cloudflare</center></body></html>',
    };

    try {
      await api.login({ email: 'admin@test.com', password: 'Password123!' });
      assert(false, 'Should have thrown error on 502');
    } catch (err: any) {
      assert(!err.message.includes('body stream already read'), 'Must NOT throw body stream already read on HTML');
      assert(!err.message.includes('Body has already been consumed'), 'Must NOT throw body already consumed');
      assert(err.message.includes('502 Bad Gateway'), `Error should reflect HTML title, got: ${err.message}`);
      assertEqual(err.status, 502, 'Must attach status 502');
      console.log('   ✓ HTML error cleanly handled without stream error:', err.message);
    }

    // ------------------------------------------------------------------------
    // Test 4: Server error with malformed JSON body
    // ------------------------------------------------------------------------
    console.log('\n4. Testing server error with malformed JSON body (HTTP 500 malformed JSON)...');
    mockServerResponse = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: '{"error": "Database error', // truncated JSON
    };

    try {
      await api.login({ email: 'admin@test.com', password: 'Password123!' });
      assert(false, 'Should have thrown error on 500');
    } catch (err: any) {
      assert(!err.message.includes('body stream already read'), 'Must NOT throw body stream already read on malformed JSON');
      assert(!err.message.includes('Body has already been consumed'), 'Must NOT throw body already consumed');
      assertEqual(err.status, 500, 'Must attach status 500');
      assert(err.message.includes('Database error') || err.message.includes('Server error 500'), 'Must provide sensible error message');
      console.log('   ✓ Malformed JSON safely handled without stream error:', err.message);
    }

    // ------------------------------------------------------------------------
    // Test 5: Plain text error response (HTTP 429 Too Many Requests)
    // ------------------------------------------------------------------------
    console.log('\n5. Testing plain text error response (HTTP 429 Plain Text)...');
    mockServerResponse = {
      status: 429,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Too many login attempts. Please try again in 300 seconds.',
    };

    try {
      await api.login({ email: 'admin@test.com', password: 'Password123!' });
      assert(false, 'Should have thrown error on 429');
    } catch (err: any) {
      assert(!err.message.includes('body stream already read'), 'Must NOT throw stream read error on plain text');
      assertEqual(err.message, 'Too many login attempts. Please try again in 300 seconds.', 'Must preserve plain text message');
      assertEqual(err.status, 429, 'Must attach status 429');
      console.log('   ✓ Plain text error message preserved:', err.message);
    }

    // ------------------------------------------------------------------------
    // Test 6: Empty error response body (HTTP 500 with 0 bytes)
    // ------------------------------------------------------------------------
    console.log('\n6. Testing empty error response body (HTTP 500 with empty body)...');
    mockServerResponse = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: '',
    };

    try {
      await api.login({ email: 'admin@test.com', password: 'Password123!' });
      assert(false, 'Should have thrown error on 500 empty');
    } catch (err: any) {
      assert(!err.message.includes('body stream already read'), 'Must NOT throw stream read error on empty body');
      assertEqual(err.status, 500, 'Must attach status 500');
      assert(err.message.includes('500'), `Must indicate 500 in message, got: ${err.message}`);
      console.log('   ✓ Empty body error cleanly handled:', err.message);
    }

    // ------------------------------------------------------------------------
    // Test 7: Rate limit lock with structured code and retryAfter
    // ------------------------------------------------------------------------
    console.log('\n7. Testing structured rate-limited response with error code...');
    mockServerResponse = {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Too many failed login attempts. For security reasons, please try again in 300 seconds.',
        code: 'RATE_LIMITED',
        retryAfter: 300,
      }),
    };

    try {
      await api.login({ email: 'admin@test.com', password: 'Password123!' });
      assert(false, 'Should have thrown on 429');
    } catch (err: any) {
      assertEqual(err.code, 'RATE_LIMITED', 'Must preserve error code');
      assertEqual(err.data?.retryAfter, 300, 'Must preserve error data');
      console.log('   ✓ Error code and metadata preserved:', err.code);
    }

    // ------------------------------------------------------------------------
    // Test 8: Empty successful response (HTTP 204 No Content)
    // ------------------------------------------------------------------------
    console.log('\n8. Testing empty successful response (HTTP 204 No Content)...');
    mockServerResponse = {
      status: 204,
      headers: {},
      body: '',
    };

    const noContentRes = await api.getHealth();
    assert(noContentRes === ('' as any), 'Empty body returns empty string safely without error');
    console.log('   ✓ Empty 204 response handled gracefully without JSON parse error');

  } finally {
    server.close();
  }

  console.log('\n--- ALL 8 AUTH & RESPONSE-HANDLING TESTS PASSED SUCCESSFULLY! ---\n');
}

runAuthResponseHandlingTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
