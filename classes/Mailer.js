const pug = require('pug');
const path = require('path');
const sendEmail = require('../utils/send_email');

class Mailer {
  constructor({
    to,
    subject,
    fullname,
    role,
    purpose,
    status,
    rewardPoints,
    cc,
    link,
  }) {
    this.to = to;
    this.subject = subject;
    this.fullname = fullname;
    this.role = role;
    this.purpose = purpose;
    this.status = status;
    this.rewardPoints = rewardPoints;
    this.cc = cc;
    this.link = link;
  }

  async send() {
    const images = ['first.jpg', 'second.jpg', 'third.jpg'];
    // Get image by shuffle
    const image = images[Math.floor(Math.random() * images.length)];
    const imagePath = path.join(__dirname, '..', `public/images/${image}`);

    // Compile the Pug template
    const compiledFunction = pug.compileFile(
      path.join(__dirname, '..', 'views/email_template.pug')
    );

    const message =
      this.purpose === 'submission'
        ? `${this.fullname} has submitted a new reward points entry for your review and approval. Please log into the system to view the details.`
        : this.purpose === 'approval'
        ? `We are letting you know that your recent reward points entry has been ${this.status}. Please log into the system to view the details.`
        : this.purpose === 'resubmission'
        ? `${this.fullname} has resubmitted a reward entry for ${this.rewardPoints}. Please log into the system to review the entry and either approve or reject the reward points entry.`
        : `${this.fullname} has approved a reward entry for ${this.rewardPoints}. Please log into the system to review the entry and either approve or reject the reward points entry.`;

    const mailOptions = {
      to: this.to,
      subject: this.subject,
      html: compiledFunction({
        subject: this.subject,
        role: this.role,
        message,
        link: this.link,
      }),
      attachments: [
        {
          filename: image,
          path: imagePath,
          cid: 'image',
        },
      ],
      cc: this.cc,
    };

    await sendEmail(mailOptions);

    return true;
  }
}

module.exports = { Mailer };
