const log4js = require('log4js');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

log4js.configure({
  appenders: {
    console: { type: 'console' },
    app: {
      type: 'file',
      filename: path.join(__dirname, '../logs/app.log'),
      maxLogSize: 10485760,
      backups: 3,
      compress: true,
    },
    errorFile: {
      type: 'file',
      filename: path.join(__dirname, '../logs/error.log'),
    },
    errors: {
      type: 'logLevelFilter',
      appender: 'errorFile',
      level: 'error',
    },
    accessLog: {
      type: 'dateFile',
      filename: path.join(__dirname, '../logs/access.log'),
      pattern: '.yyyy-MM-dd',
      compress: true,
    },
  },
  categories: {
    default: {
      appenders: isProd ? ['console', 'app', 'errors'] : ['app', 'errors'],
      level: isProd ? 'info' : 'debug',
    },
    access: {
      appenders: isProd ? ['console', 'accessLog'] : ['accessLog'],
      level: 'info',
    },
    http: {
      appenders: isProd ? ['console', 'accessLog'] : ['accessLog'],
      level: 'info',
    },
  },
});

module.exports = log4js;
