// Turns any error thrown inside a route into a clear, user-friendly response:
//   { message: "<one readable sentence>", errors: { field: "<problem with that field>" } }
// Technical details (stack traces, database messages) are logged on the server only.

const LABELS = {
  username: 'Username',
  name: 'Name',
  email: 'Email',
  password: 'Password',
  bio: 'Bio',
  dob: 'Date of birth',
  description: 'Description',
  content: 'Message',
  userId: 'User',
  friendId: 'User',
  recipientId: 'User',
  senderId: 'User',
  postId: 'Post',
  id: 'ID',
};
const label = (field) => LABELS[field] || (field ? field.charAt(0).toUpperCase() + field.slice(1) : 'This field');

const validationMessage = (e) => {
  const L = label(e.path);
  switch (e.kind) {
    case 'required':
      return `${L} is required`;
    case 'minlength':
      return `${L} must be at least ${e.properties?.minlength} characters`;
    case 'maxlength':
      return `${L} must be at most ${e.properties?.maxlength} characters`;
    case 'regexp':
      return e.path === 'email' ? 'Please enter a valid email address' : `${L} format is not valid`;
    case 'enum':
      return `${L} has an invalid value`;
    case 'date':
    case 'Date':
    case 'ObjectId':
    case 'Number':
    case 'cast':
      return `${L} is not valid`;
    default:
      return e.properties?.message || `${L} is not valid`;
  }
};

const formatError = (err) => {
  // Mongoose schema validation (e.g. username shorter than 3 characters)
  if (err.name === 'ValidationError' && err.errors) {
    const errors = {};
    Object.values(err.errors).forEach((e) => {
      errors[e.path] = validationMessage(e);
    });
    return { status: 400, message: Object.values(errors)[0], errors };
  }

  // Unique index violation (race between two sign-ups)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    const message =
      field === 'email'
        ? 'An account with this email already exists'
        : field === 'username'
        ? 'That username is already taken'
        : `${label(field)} already exists`;
    return { status: 409, message, errors: field ? { [field]: message } : undefined };
  }

  // Bad ObjectId or value type in a URL/body
  if (err.name === 'CastError') {
    return { status: 400, message: `${label(err.path)} is not valid` };
  }

  // Expired / invalid login token
  if (err.name === 'TokenExpiredError') {
    return { status: 401, message: 'Your session has expired. Please log in again.' };
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    return { status: 401, message: 'Your login is no longer valid. Please log in again.' };
  }

  // File upload problems
  if (err.name === 'MulterError') {
    const map = {
      LIMIT_FILE_SIZE: 'That file is too large. Please choose a smaller file.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file upload. Please try again.',
    };
    return { status: 400, message: map[err.code] || 'The file could not be uploaded.' };
  }
  if (typeof err.message === 'string' && /^Only .* (files )?(are|is) allowed/i.test(err.message)) {
    return { status: 400, message: err.message };
  }

  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return { status: 400, message: 'The data sent was not valid. Please try again.' };
  }
  if (err.type === 'entity.too.large') {
    return { status: 413, message: 'The data you sent is too large.' };
  }

  // Database unreachable
  if (['MongoNetworkError', 'MongooseServerSelectionError', 'MongoServerSelectionError'].includes(err.name)) {
    return { status: 503, message: 'The service is temporarily unavailable. Please try again in a moment.' };
  }

  return { status: 500, message: 'Something went wrong on our side. Please try again in a moment.' };
};

// Use in a catch block:  return sendError(res, err, 'Registration');
const sendError = (res, err, context = '') => {
  const { status, message, errors } = formatError(err);
  if (status >= 500) {
    console.error(`${context ? context + ': ' : ''}${err.stack || err}`);
  } else {
    console.warn(`${context ? context + ': ' : ''}${status} ${message}`);
  }
  if (res.headersSent) return;
  const body = { message };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
};

module.exports = { formatError, sendError };