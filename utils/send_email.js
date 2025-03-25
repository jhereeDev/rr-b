const nodemailer = require('nodemailer');
const ErrorResponse = require('../utils/error_response');
require('dotenv').config({ path: '../env' });

const email = process.env.NODEMAILER_EMAIL;
const password = process.env.NODEMAILER_PASSWORD;
const username = process.env.NODEMAILER_USERNAME;
const host = process.env.NODEMAILER_HOST;
const port = process.env.NODEMAILER_PORT;

// Credentials if mailtrap is used
const mailtrapHost = process.env.MAILTRAP_HOST;
const mailtrapPort = process.env.MAILTRAP_PORT;
const mailtrapUser = process.env.MAILTRAP_USER;
const mailtrapPassword = process.env.MAILTRAP_PASSWORD;

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

    // const transporter = nodemailer.createTransport({
    //     host: host,
    //     port: port,
    //     secure: false,
    //     auth: {
    //         user: username,
    //         pass: password,
    //     },
    // });

    const mailOptions = {
        from: `"${username}" <${email}>`,
        to: to,
        subject: subject,
        text: body,
        html: html,
        attachments: attachments,
    };

    mailOptions.cc = cc;

    const transporter = nodemailer.createTransport({
        host: mailtrapHost,
        port: mailtrapPort,
        secure: false,
        auth: {
            user: mailtrapUser,
            pass: mailtrapPassword,
        },
    });

    return await transporter.sendMail(mailOptions);
};

module.exports = sendMail;
