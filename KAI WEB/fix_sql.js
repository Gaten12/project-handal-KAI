const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

// Replace the invalid json_extract query
server = server.replace(
    /json_extract\(data, "\$\.scheduleId"\)/g,
    "json_extract(data, '$.scheduleId')"
);

fs.writeFileSync('server.js', server);
console.log('Fixed SQLite json_extract syntax');
