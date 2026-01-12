// ============================================
// INVITATION CONTROLLER
// server/controllers/invitation.controller.js
// ============================================

const Invitation = require('../models/invitation.model');
const User = require('../models/user.model');
const EmailService = require('../services/email.service');
const TokenService = require('../services/token.service');
const EncryptionService = require('../services/encryption.service');
const ApiResponse = require('../utils/response');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

class InvitationController {
  
  /**
   * Create and send invitation
   * POST /api/invitations
   */
  static async create(req, res) {
    try {
      const { email, name, message, department, subjects } = req.body;
      const invitedBy = req.user.id;
      
      if (!email) {
        return ApiResponse.error(res, 'Email is required', 400);
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return ApiResponse.error(res, 'A user with this email already exists', 409);
      }
      
      // Check for pending invitation
      const existingInvite = await Invitation.findOne({
        email: email.toLowerCase(),
        status: 'pending',
        expiresAt: { $gt: new Date() }
      });
      
      if (existingInvite) {
        return ApiResponse.error(res, 'An invitation is already pending for this email', 409);
      }
      
      // Create invitation
      const invitation = await Invitation.create({
        email: email.toLowerCase(),
        name,
        role: 'teacher',
        token: Invitation.generateToken(),
        invitedBy,
        message,
        department,
        subjects: subjects || []
      });
      
      // Get inviter info
      const inviter = await User.findById(invitedBy).select('name');
      
      // Send invitation email
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const inviteUrl = `${clientUrl}/accept-invitation?token=${invitation.token}`;
      
      await EmailService.sendTeacherInvitation({
        to: email,
        schoolName: process.env.SCHOOL_NAME || 'School Management System',
        inviterName: inviter?.name || 'Admin',
        inviteUrl,
        expiresIn: '7 days'
      });
      
      return ApiResponse.created(res, {
        id: invitation._id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt
      }, 'Invitation sent successfully');
      
    } catch (err) {
      console.error('Create invitation error:', err);
      return ApiResponse.error(res, err.message || 'Failed to create invitation', 500);
    }
  }
  
  /**
   * List all invitations
   * GET /api/invitations
   */
  static async list(req, res) {
    try {
      const { status } = req.query;
      
      const query = {};
      if (status) query.status = status;
      
      const invitations = await Invitation.find(query)
        .populate('invitedBy', 'name email')
        .populate('acceptedBy', 'name email')
        .sort({ createdAt: -1 });
      
      return ApiResponse.success(res, invitations);
      
    } catch (err) {
      console.error('List invitations error:', err);
      return ApiResponse.error(res, err.message || 'Failed to list invitations', 500);
    }
  }
  
  /**
   * Verify invitation token (public)
   * GET /api/invitations/verify/:token
   */
  static async verify(req, res) {
    try {
      const { token } = req.params;
      
      const invitation = await Invitation.findValidByToken(token);
      
      if (!invitation) {
        return ApiResponse.error(res, 'Invalid or expired invitation', 404);
      }
      
      return ApiResponse.success(res, {
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        department: invitation.department,
        message: invitation.message,
        expiresAt: invitation.expiresAt
      }, 'Invitation is valid');
      
    } catch (err) {
      console.error('Verify invitation error:', err);
      return ApiResponse.error(res, err.message || 'Failed to verify invitation', 500);
    }
  }
  
  /**
   * Accept invitation and create user account
   * POST /api/invitations/accept
   */
  static async accept(req, res) {
    try {
      const { token, name, password } = req.body;
      
      if (!token || !password) {
        return ApiResponse.error(res, 'Token and password are required', 400);
      }
      
      // Find valid invitation
      const invitation = await Invitation.findValidByToken(token);
      
      if (!invitation) {
        return ApiResponse.error(res, 'Invalid or expired invitation', 404);
      }
      
      // Validate password
      const passwordValidation = EncryptionService.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return ApiResponse.error(res, 'Password does not meet requirements', 400);
      }
      
      // Create user
      const user = await User.create({
        name: name || invitation.name || invitation.email.split('@')[0],
        email: invitation.email,
        password, // Will be hashed by pre-save hook
        role: 'teacher',
        isVerified: true, // Email already verified via invitation
        isActive: true
      });
      
      // Mark invitation as accepted
      await invitation.markAccepted(user._id);
      
      // Generate tokens
      const tokens = await TokenService.generateTokenPair(
        user,
        req.ip,
        req.get('user-agent')
      );
      
      // Set refresh token cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
      return ApiResponse.created(res, {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn
      }, 'Account created successfully');
      
    } catch (err) {
      console.error('Accept invitation error:', err);
      
      if (err.code === 11000) {
        return ApiResponse.error(res, 'A user with this email already exists', 409);
      }
      
      return ApiResponse.error(res, err.message || 'Failed to accept invitation', 500);
    }
  }
  
  /**
   * Resend invitation
   * POST /api/invitations/:id/resend
   */
  static async resend(req, res) {
    try {
      const { id } = req.params;
      
      const invitation = await Invitation.findById(id);
      
      if (!invitation || invitation.status !== 'pending') {
        return ApiResponse.error(res, 'Invitation not found or already used', 404);
      }
      
      // Regenerate token and extend expiry
      invitation.token = Invitation.generateToken();
      invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await invitation.save();
      
      // Resend email
      const inviter = await User.findById(invitation.invitedBy).select('name');
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const inviteUrl = `${clientUrl}/accept-invitation?token=${invitation.token}`;
      
      await EmailService.sendTeacherInvitation({
        to: invitation.email,
        schoolName: process.env.SCHOOL_NAME || 'School Management System',
        inviterName: inviter?.name || 'Admin',
        inviteUrl,
        expiresIn: '7 days'
      });
      
      return ApiResponse.success(res, { expiresAt: invitation.expiresAt }, 'Invitation resent successfully');
      
    } catch (err) {
      console.error('Resend invitation error:', err);
      return ApiResponse.error(res, err.message || 'Failed to resend invitation', 500);
    }
  }
  
  /**
   * Cancel invitation
   * DELETE /api/invitations/:id
   */
  static async cancel(req, res) {
    try {
      const { id } = req.params;
      
      const invitation = await Invitation.findById(id);
      
      if (!invitation) {
        return ApiResponse.error(res, 'Invitation not found', 404);
      }
      
      await invitation.cancel();
      
      return ApiResponse.success(res, null, 'Invitation cancelled');
      
    } catch (err) {
      console.error('Cancel invitation error:', err);
      return ApiResponse.error(res, err.message || 'Failed to cancel invitation', 500);
    }
  }
}

module.exports = InvitationController;
