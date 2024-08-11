const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const FormData = require('form-data');
const Mailgun = require('mailgun.js');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('MAILGUN_API_KEY:', process.env.MAILGUN_API_KEY);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.error('Error connecting to MongoDB:', error));

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  date: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
  url: 'https://api.mailgun.net'
});

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL
}));

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const newContact = new Contact({ name, email, message });
    await newContact.save();

    const mailOptions = {
      from: `Mailgun Sandbox <postmaster@${process.env.MAILGUN_DOMAIN}>`,
      to: process.env.DESTINATION_EMAIL,
      subject: 'New message received',
      text: `You have received a message from ${name} (${email}):\n\n${message}`
    };

    mg.messages.create(process.env.MAILGUN_DOMAIN, mailOptions)
      .then(response => {
        console.log('Email sent:', response);
        res.status(200).send('Form received successfully');
      })
      .catch(error => {
        console.error('Error sending email:', error);
        res.status(500).send('Server error');
      });

  } catch (error) {
    console.error('Error processing form data:', error);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
