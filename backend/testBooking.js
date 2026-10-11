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
    const regRes = await request('POST', '/api/users/register', { name: 'Booking User', email: 'book@example.com', password: 'password123' });
    const token = regRes.data.token;
    console.log(`Token acquired.`);

    console.log('\n2. Fetching Organizations...');
    const orgRes = await request('GET', '/api/organizations');
    const org = orgRes.data[0];
    console.log(`Org: ${org.name} (${org._id})`);

    console.log('\n3. Fetching Services...');
    const svcRes = await request('GET', `/api/services/org/${org._id}`);
    const service = svcRes.data.find(s => s.type === 'appointment');
    console.log(`Service: ${service.name} (${service._id})`);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    console.log(`\n4. Fetching Slots for ${dateStr}...`);
    const slotsRes = await request('GET', `/api/appointments/available-slots?orgId=${org._id}&serviceId=${service._id}&date=${dateStr}`);
    console.log(`Available slots: ${slotsRes.data.length}`);
    const timeToBook = slotsRes.data[0].time24;

    console.log(`\n5. Booking Appointment at ${timeToBook}...`);
    const bookRes = await request('POST', '/api/appointments', {
      organization: org._id,
      service: service._id,
      date: dateStr,
      time: timeToBook
    }, token);
    console.log(`Status: ${bookRes.status}, TokenNumber: ${bookRes.data.tokenNumber}`);
    const appointmentId = bookRes.data._id;

    console.log(`\n6. Trying to book duplicate...`);
    const dupRes = await request('POST', '/api/appointments', {
      organization: org._id,
      service: service._id,
      date: dateStr,
      time: slotsRes.data[1].time24
    }, token);
    console.log(`Status: ${dupRes.status}, Message: ${dupRes.data.message}`);

    console.log(`\n7. Rescheduling Appointment...`);
    const newTime = slotsRes.data[2].time24;
    const reschedRes = await request('PUT', `/api/appointments/${appointmentId}/reschedule`, {
      date: dateStr,
      time: newTime
    }, token);
    console.log(`Status: ${reschedRes.status}, New Time: ${reschedRes.data.appointment.time}`);

    console.log(`\n8. Cancelling Appointment...`);
    const cancelRes = await request('PUT', `/api/appointments/${appointmentId}/cancel`, null, token);
    console.log(`Status: ${cancelRes.status}, Message: ${cancelRes.data.message}`);

    console.log('\nAll booking workflow tests completed.');
    process.exit(0);
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
};

setTimeout(runTests, 2000);
