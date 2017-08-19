const nodemailer = require('nodemailer');
const { promisifyAll } = require('bluebird')

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 465,
    secure: true, // secure:true for port 465, secure:false for port 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

module.exports = promisifyAll(transporter)
