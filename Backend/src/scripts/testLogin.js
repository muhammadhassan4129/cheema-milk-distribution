const http = require('http');

function post(body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 5000,
      path: '/api/auth/login', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', e => resolve({ success: false, message: e.message }));
    req.write(data);
    req.end();
  });
}

async function main() {
  const tests = [
    { username: 'admin',  password: 'admin123' },
    { username: 'waqas',  password: 'waqas123' },
    { username: 'mt1',    password: 'pass1234' },
  ];

  console.log('====== LOGIN TESTS ======');
  for (const t of tests) {
    const r = await post(t);
    const status = r.success
      ? `✅ OK  | Role: ${r.data?.user?.role}`
      : `❌ FAIL | ${r.message}`;
    console.log(`  ${(t.username + '/' + t.password).padEnd(22)} => ${status}`);
  }
}

main();
