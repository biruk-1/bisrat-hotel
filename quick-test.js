// Quick backend test
const https = require('https');

console.log('🧪 Quick Backend Test');
console.log('====================');

function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'pos-system-2deh.onrender.com',
      port: 443,
      path: path,
      method: 'GET',
      timeout: 30000
    };

    console.log(`\n${description}:`);
    console.log(`Testing: https://pos-system-2deh.onrender.com${path}`);
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log('✅ Success - Valid JSON response');
            if (json.status) console.log(`Server status: ${json.status}`);
          } catch (e) {
            console.log('⚠️  Success but invalid JSON');
          }
        } else {
          console.log('❌ Error response');
          if (data.includes('502')) {
            console.log('   → Service is sleeping or crashed');
          }
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Request failed: ${error.message}`);
      resolve();
    });

    req.on('timeout', () => {
      console.log('❌ Request timed out (30s)');
      req.destroy();
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  await testEndpoint('/api/health', '🏥 Health Check');
  await testEndpoint('/api/tables', '🪑 Tables API');
  await testEndpoint('/api/items', '🍽️  Items API');
  
  console.log('\n📋 Next Steps:');
  console.log('1. If all tests fail → Redeploy backend on Render');
  console.log('2. If 502 errors → Check Render logs for startup errors');
  console.log('3. If timeouts → Service might be starting up (wait 2-3 minutes)');
  console.log('4. If success → Your backend is working!');
}

runTests();
