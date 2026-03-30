const { checkSSL } = require('./server/sslService');

const urls = [
    'https://vlt.disaster.go.th',
    'https://portal.disaster.go.th'
];

async function test() {
    for (const u of urls) {
        console.log(`Testing ${u}...`);
        const result = await checkSSL(u);
        console.log(JSON.stringify(result, null, 2));
        console.log('-------------------');
    }
}

test();

