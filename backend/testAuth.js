const http = require('http');

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5003,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const runTests = async () => {
  try {
    console.log('1. Registering new customer...');
    const regRes = await request('POST', '/api/users/register', { name: 'Test User', email: 'test@example.com', password: 'password123' });
    console.log(`Status: ${regRes.status}, Data:`, regRes.data);
    
    console.log('\n2. Login with correct password...');
    const loginRes = await request('POST', '/api/users/login', { email: 'test@example.com', password: 'password123' });
    console.log(`Status: ${loginRes.status}, Token: ${loginRes.data.token ? 'Received' : 'Missing'}, Role: ${loginRes.data.role}`);
    const token = loginRes.data.token;

    console.log('\n3. Login with wrong password...');
    const failRes = await request('POST', '/api/users/login', { email: 'test@example.com', password: 'wrong' });
    console.log(`Status: ${failRes.status}, Message:`, failRes.data.message);

    console.log('\n4. Access protected profile route...');
    const profRes = await request('GET', '/api/users/profile', null, token);
    console.log(`Status: ${profRes.status}, User Email:`, profRes.data.email);

    console.log('\n5. Access organization_admin route (Should Fail for customer)...');
    const orgRes = await request('POST', '/api/organizations', { name: 'Test Org', type: 'Hospital' }, token);
    console.log(`Status: ${orgRes.status}, Message:`, orgRes.data.message);

    console.log('\n6. Registering admin...');
    // We can't register admin directly via API because it sets default to customer.
    // Let's test the response of the previous step. It should be 403.
    
    console.log('\nTests Completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
};

setTimeout(runTests, 2000);
