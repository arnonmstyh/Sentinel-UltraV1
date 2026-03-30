const { checkSSL } = require('./server/sslService');

const urls = [
    'https://vlt.disaster.go.th',
    'https://portal.disaster.go.th'
];

async function test() {
    console.log('Testing improved SSL checker...\n');
    for (const u of urls) {
        console.log(`Testing ${u}...`);
        const start = Date.now();
        const result = await checkSSL(u, 3); // 3 retries
        const duration = Date.now() - start;
        console.log(`Result (took ${duration}ms):`);
        console.log(JSON.stringify(result, null, 2));
        console.log('-------------------\n');
    }
}

test();

