import Joi from 'joi';

export const signUpSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
  }),
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.empty': 'Username is required',
  }),
  email: Joi.string().email({ tlds: { allow: false } }).required().messages({
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email is required',
  }),
  dateOfBirth: Joi.string().required().messages({
    'string.empty': 'Date of birth is required',
  }),
  gender: Joi.string().valid('male', 'female', 'other').required().messages({
    'any.only': 'Please select a gender',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'string.empty': 'Password is required',
  }),
  rePassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'string.empty': 'Please confirm your password',
  }),
});

export const signInSchema = Joi.object({
  email: Joi.string().required().messages({
    'string.empty': 'Email or Username is required',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
});

export const postSchema = Joi.object({
  body: Joi.string().min(1).max(2000).required().messages({
    'string.empty': 'Post text content cannot be empty',
  }),
});

export const changePasswordSchema = Joi.object({
  password: Joi.string().required().messages({
    'string.empty': 'Current password is required',
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'New password must be at least 6 characters',
    'string.empty': 'New password is required',
  }),
});
