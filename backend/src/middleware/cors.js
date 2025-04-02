const cors = require('cors');

// Cấu hình CORS
//origin public path 'http://sample.pihlgp.com'
const corsOptions = {
    origin: 'http://sample.pihlgp.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;
