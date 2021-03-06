// const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const usersScheema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Username is required !']
  },
  email: {
    type: String,
    required: [true, 'Email is required !'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please enter a valid email']
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Password is required !'],
    minlength: [6, 'password must have minimal 6 characters'],
    select: false
  },
  confirmPassword: {
    type: String,
    required: [true, 'Confirm Password is required !'],
    validate: {
      validator: function(val) {
        return val === this.password;
      },
      message: 'Password and password confirm must same !'
    }
  },
  photo: String,
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  changedAt: Date
});

// users methods
usersScheema.methods.testPassword = async function(newPass, userPass) {
  return await bcrypt.compare(newPass, userPass);
};

usersScheema.methods.testUpdatePassword = function(jwtTimeStamp) {
  const userTimeStamp = parseInt(this.changedAt.getTime() / 1000, 10);

  // false mean password not changed
  return jwtTimeStamp < userTimeStamp;
};

usersScheema.methods.createResetPassword = function(id) {
  const resetToken = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: Number(process.env.JWT_RESET)
  });

  return resetToken;
};

// documents middleware
usersScheema.pre('save', async function(next) {
  // ONLY RUN this is password was actualy modified
  if (!this.isModified('password')) return next();

  // hashing password with bcrypt
  this.password = await bcrypt.hash(this.password, 12);
  this.confirmPassword = undefined;
  next();
});

usersScheema.pre('save', function(next) {
  this.changedAt = Date.now() - 1000;
  next();
});

usersScheema.pre('update', function(next) {
  this.changedAt = Date.now() - 1000;
  next();
});

usersScheema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

const Users = mongoose.model('Users', usersScheema);

module.exports = Users;
