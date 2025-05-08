const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const app = express();

// Imports
const errorHandler = require('./middlewares/error');
const log4js = require('./config/log4js_config');
const accessLogger = log4js.getLogger('access'); // Logger for access logs (declared only once)

// Route module Imports
const authRoute = require('./routes/auth_route');
const userRoute = require('./routes/user_route');
const rewardPointsRoute = require('./routes/reward_points_route');
const criteria = require('./routes/criteria_route');
const leaderboards = require('./routes/leaderboards_route');
const approval = require('./routes/approval_route');
const consent = require('./routes/consent_route');
const memberRoute = require('./routes/member_route');
const adminRoute = require('./routes/admin_route');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cookieParser());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.disable('X-Powered-By');
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'DELETE'], // Add the methods you need
        allowedHeaders: ['Content-Type', 'Authorization'], // Add any custom headers you need
    })
);

app.use(log4js.connectLogger(accessLogger, { level: 'auto' })); // Access logging

app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/rewards', rewardPointsRoute);
app.use('/api/criterias', criteria);
app.use('/api/leaderboards', leaderboards);
app.use('/api/approval', approval);
app.use('/api/consent', consent);
app.use('/api/members', memberRoute);
app.use('/api/admins', adminRoute);
app.use(errorHandler);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
