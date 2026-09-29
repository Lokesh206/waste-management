const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_swms_jwt_key_2026_dev';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const ALLOWED_ROLES = ['citizen', 'collector', 'recycling_center', 'admin'];

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Register a new user
 */
async function register(req, res) {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const assignedRole = role && ALLOWED_ROLES.includes(role) ? role : 'citizen';

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      logger.auth('Registration', email, false, 'Email already exists');
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim() : null,
        password_hash,
        role: assignedRole,
      },
    });

    logger.auth('Registration', user.email, true, `Role: ${user.role}`);

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration.',
    });
  }
}

/**
 * User login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      logger.auth('Login', email, false, 'User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.is_active) {
      logger.auth('Login', email, false, 'Deactivated account');
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      logger.auth('Login', email, false, 'Incorrect password');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    logger.auth('Login', user.email, true, `Role: ${user.role}`);

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login.',
    });
  }
}

/**
 * Get current profile
 */
async function getProfile(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
}

/**
 * List active collectors (for admin task assignment)
 */
async function getCollectors(req, res) {
  try {
    const collectors = await prisma.user.findMany({
      where: { role: 'collector', is_active: true },
      select: { id: true, name: true, email: true, phone: true },
    });

    return res.status(200).json({
      success: true,
      collectors,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve collectors.',
    });
  }
}

/**
 * List all registered users (Admin only, supports role filtering)
 */
async function getAllUsers(req, res) {
  try {
    const { role } = req.query;
    const where = {};
    if (role && role !== 'ALL') {
      where.role = role.toLowerCase();
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        is_active: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    logger.error('Error retrieving users', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve registered users.',
    });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  getCollectors,
  getAllUsers,
};

