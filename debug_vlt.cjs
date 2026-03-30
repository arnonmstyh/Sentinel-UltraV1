const tls = require('tls');

const hostname = 'vlt.disaster.go.th';

console.log(`Connecting to ${hostname}...`);

const options = {
    host: hostname,
    port: 443,
    servername: hostname,
    rejectUnauthorized: false,
};

const socket = tls.connect(options, () => {
    console.log('Connected!');
    const cert = socket.getPeerCertificate();
    console.log('Certificate:', JSON.stringify(cert, (key, value) => {
        if (key === 'raw' || key === 'pubkey') return '<buffer>';
        return value;
    }, 2));
    socket.end();
});

socket.on('error', (err) => {
    console.error('Socket Error:', err);
});

socket.setTimeout(20000, () => {
    console.error('Socket Timeout');
    socket.destroy();
});

