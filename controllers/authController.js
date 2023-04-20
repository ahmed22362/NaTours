/* eslint-disable no-unused-vars */
const crypto = require('crypto');
const User = require('../models/UserModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const sendEmail = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSentToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV.trim() === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  // Create new user
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });
  createSentToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if the email and password exits
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  // 2) Check if the user exist && The password is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  // 3) If every thing okay send token to clint
  createSentToken(user, 200, res);
});
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and Check if it's true
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(
      new AppError('You are not logged in! please log in to get access.'),
      401
    );
  }
  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // 3) Check if the user still exist
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError("The user belong's to this token no longer exist.")
    );
  }
  // 4) Check if user change password
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! please login again.')
    );
  }

  // 5) Grant access to protected route
  req.user = freshUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to do this', 403));
    }
    next();
  };
};

exports.forgetPassword = catchAsync(async (req, res, next) => {
  // Find user
  const freshUser = await User.findOne({ email: req.body.email });
  if (!freshUser) {
    return next(new AppError('There is no user with this email address!', 404));
  }
  // Create reset token
  const token = freshUser.createPasswordResetToken();
  await freshUser.save({ validateBeforeSave: false });

  // Send token to user Email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/resetPassword/${token}`;
  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to ${resetURL}.\nIf you didn't request to reset your password please ignore this message `;
  try {
    await sendEmail({
      email: freshUser.email,
      subject: 'Your password reset token <valid for 10 min>',
      message,
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to mail!',
    });
  } catch (error) {
    freshUser.passwordResetToken = undefined;
    freshUser.passwordResetExpire = undefined;
    freshUser.save({ validateBeforeSave: false });
    console.log(error);
    return next(
      new AppError(
        'There wat an error during sending the email. Try again later.',
        500
      )
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // Find the user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const freshUser = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpire: { $gt: Date.now() },
  });
  if (!freshUser) {
    return next(new AppError('Token is invalid or has expire', 400));
  }
  freshUser.password = req.body.password;
  freshUser.passwordConfirm = req.body.passwordConfirm;
  freshUser.passwordResetToken = undefined;
  freshUser.passwordResetExpire = undefined;
  console.log(freshUser);
  await freshUser.save();
  // Update changedPasswordAt property for the user
  // Check password and token
  // Update the user and log in via jwt
  createSentToken(freshUser, 200, res);
});

exports.updateUserPassword = catchAsync(async (req, res, next) => {
  // Get User
  const user = await User.findById(req.user.id).select('+password');
  // Check password and compare it
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Entered password in not correct', 400));
  }
  // Update the user data
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // Log user in, send JWT
  createSentToken(user, 200, res);
});
