const https = require('https');
const http = require('http');

const BACKEND_URL = 'https://pos-system-2deh.onrender.com';
let authToken = null;

// Helper function to make HTTP requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'POS-API-Tester/1.0',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test functions
async function testHealth() {
  console.log('🏥 Testing Health Endpoint...');
  try {
    const result = await makeRequest('/api/health');
    console.log('✅ Health Check:', result.status, result.data);
    return true;
  } catch (error) {
    console.log('❌ Health Check Failed:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('🔐 Testing Login...');
  try {
    const result = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    if (result.status === 200 && result.data.token) {
      authToken = result.data.token;
      console.log('✅ Login Success:', result.data.user);
      return true;
    } else {
      console.log('❌ Login Failed:', result.status, result.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Login Error:', error.message);
    return false;
  }
}

async function testTables() {
  console.log('🪑 Testing Tables API...');
  try {
    const result = await makeRequest('/api/tables');
    console.log('✅ Tables:', result.status, `Found ${result.data.length} tables`);
    console.log('   First 3 tables:', result.data.slice(0, 3).map(t => `Table ${t.table_number}: ${t.status}`));
    return true;
  } catch (error) {
    console.log('❌ Tables Error:', error.message);
    return false;
  }
}

async function testItems() {
  console.log('🍽️ Testing Items API...');
  try {
    const result = await makeRequest('/api/items');
    console.log('✅ Items:', result.status, `Found ${result.data.length} items`);
    if (result.data.length > 0) {
      console.log('   Sample items:', result.data.slice(0, 3).map(i => `${i.name}: $${i.price}`));
    }
    return true;
  } catch (error) {
    console.log('❌ Items Error:', error.message);
    return false;
  }
}

async function testOrders() {
  if (!authToken) {
    console.log('⚠️ Skipping Orders test - no auth token');
    return false;
  }
  
  console.log('📋 Testing Orders API...');
  try {
    const result = await makeRequest('/api/orders');
    console.log('✅ Orders:', result.status, `Found ${result.data.length} orders`);
    return true;
  } catch (error) {
    console.log('❌ Orders Error:', error.message);
    return false;
  }
}

async function testUsers() {
  if (!authToken) {
    console.log('⚠️ Skipping Users test - no auth token');
    return false;
  }
  
  console.log('👥 Testing Users API...');
  try {
    const result = await makeRequest('/api/users');
    console.log('✅ Users:', result.status, `Found ${result.data.length} users`);
    console.log('   Users:', result.data.map(u => `${u.username} (${u.role})`));
    return true;
  } catch (error) {
    console.log('❌ Users Error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 POS Backend API Tests');
  console.log('========================');
  console.log(`Backend: ${BACKEND_URL}`);
  console.log('');

  const results = [];
  
  // Test health first (this will wake up the service)
  console.log('⏰ Waking up backend service...');
  results.push(await testHealth());
  
  // Wait a moment for service to fully wake up
  if (results[0]) {
    console.log('⏳ Waiting for service to fully initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Run other tests
  results.push(await testLogin());
  results.push(await testTables());
  results.push(await testItems());
  results.push(await testOrders());
  results.push(await testUsers());
  
  // Summary
  console.log('');
  console.log('📊 Test Summary');
  console.log('===============');
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Your backend is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the errors above.');
  }
  
  console.log('');
  console.log('🔗 You can also test manually:');
  console.log(`   Health: ${BACKEND_URL}/api/health`);
  console.log(`   Tables: ${BACKEND_URL}/api/tables`);
  console.log(`   Items:  ${BACKEND_URL}/api/items`);
}

// Run the tests
runTests().catch(console.error);
