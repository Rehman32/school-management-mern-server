// ============================================
// INVITATION ROUTES
// server/routes/invitation.routes.js
// ============================================

const express = require('express');
const router = express.Router();
const InvitationController = require('../controllers/invitation.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// ============================================
// PUBLIC ROUTES (No Auth Required)
// ============================================

// Verify invitation token
router.get('/verify/:token', InvitationController.verify);

// Accept invitation and create account
router.post('/accept', InvitationController.accept);

// ============================================
// PROTECTED ROUTES (Admin Only)
// ============================================

router.use(protect);

// Create and send invitation
router.post('/', authorize('admin'), InvitationController.create);

// List all invitations
router.get('/', authorize('admin'), InvitationController.list);

// Resend invitation
router.post('/:id/resend', authorize('admin'), InvitationController.resend);

// Cancel invitation
router.delete('/:id', authorize('admin'), InvitationController.cancel);

module.exports = router;
