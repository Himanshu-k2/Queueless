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
    console.log('1. Registering customer...');
    const custRes = await request('POST', '/api/users/register', { name: 'Queue User', email: 'queue@example.com', password: 'password123' });
    const custToken = custRes.data.token;

    console.log('\n2. Registering staff... (simulated via db seed)');
    // Since we seed an admin, we will login as admin to act as staff
    const staffRes = await request('POST', '/api/users/login', { email: 'admin@queue.less', password: 'password' });
    const staffToken = staffRes.data.token;

    console.log('\n3. Fetching Organizations & Queue Service...');
    const orgRes = await request('GET', '/api/organizations');
    const org = orgRes.data[0];
    const svcRes = await request('GET', `/api/services/org/${org._id}`);
    const queueService = svcRes.data.find(s => s.type === 'queue');
    
    console.log(`\n4. Customer Joins Queue...`);
    const joinRes = await request('POST', '/api/queue', {
      organization: org._id,
      service: queueService._id
    }, custToken);
    console.log(`Status: ${joinRes.status}, Token: ${joinRes.data.tokenNumber}`);
    const entryId = joinRes.data._id;

    console.log(`\n5. Checking Queue Status...`);
    const statusRes = await request('GET', `/api/queue/${entryId}`, null, custToken);
    console.log(`Status: ${statusRes.status}, People Ahead: ${statusRes.data.peopleAhead}, ETA: ${statusRes.data.estimatedWaitTime} mins`);

    console.log(`\n6. Trying to join duplicate...`);
    const dupRes = await request('POST', '/api/queue', {
      organization: org._id,
      service: queueService._id
    }, custToken);
    console.log(`Status: ${dupRes.status}, Message: ${dupRes.data.message}`);

    console.log(`\n7. Staff calls next customer...`);
    const callRes = await request('POST', '/api/queue/call-next', {
      organization: org._id,
      service: queueService._id
    }, staffToken);
    console.log(`Status: ${callRes.status}, Called: ${callRes.data.entry.tokenNumber}`);

    console.log(`\n8. Checking Queue Status again (now Called)...`);
    const status2Res = await request('GET', `/api/queue/${entryId}`, null, custToken);
    console.log(`Status: ${status2Res.status}, Current Status: ${status2Res.data.entry.status}, Serving Token: ${status2Res.data.currentServingToken}`);

    console.log(`\n9. Staff completes customer and auto-calls next...`);
    const completeRes = await request('PUT', `/api/queue/${entryId}`, {
      status: 'completed',
      autoCallNext: true
    }, staffToken);
    console.log(`Status: ${completeRes.status}, Entry Status: ${completeRes.data.entry.status}`);
    if (completeRes.data.nextEntry) {
      console.log(`Next Called: ${completeRes.data.nextEntry.tokenNumber}`);
    } else {
      console.log(`No more customers in queue.`);
    }

    console.log('\nAll queue workflow tests completed.');
    process.exit(0);
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
};

setTimeout(runTests, 2000);
