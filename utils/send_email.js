const nodemailer = require('nodemailer');
const ErrorResponse = require('../utils/error_response');
require('dotenv').config({ path: '../env' });

const email = process.env.NODEMAILER_EMAIL;
const password = process.env.NODEMAILER_PASSWORD;
const username = process.env.NODEMAILER_USERNAME;
const host = process.env.NODEMAILER_HOST;
const port = process.env.NODEMAILER_PORT;

const sendMail = async ({
  to,
  body,
  html,
  subject,
  attachments = undefined,
  cc = undefined,
}) => {
  if (typeof to == 'undefined')
    throw new ErrorResponse('Email is required', 400);

  if (typeof html == 'undefined')
    throw new ErrorResponse('Email body is required', 400);

  if (typeof subject == 'undefined')
    throw new ErrorResponse('Email subject is required', 400);

  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: false,
    auth: {
      user: username,
      pass: password,
    },
  });

  const mailOptions = {
    from: `"${username}" <${email}>`,
    to:
      process.env.NODE_ENV === 'development'
        ? process.env.NODE_TESTER_EMAILS
        : to,
    subject: subject,
    text: body,
    html: html,
    attachments: attachments,
  };

  mailOptions.cc =
    process.env.NODE_ENV === 'development' ? process.env.TESTER_EMAILS_CC : cc;

  return await transporter.sendMail(mailOptions);
};

module.exports = sendMail;
