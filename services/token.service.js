// ============================================
// TOKEN SERVICE
// Handles JWT generation, validation, and refresh
// ============================================

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/refreshToken.model");
const { TOKEN_EXPIRY } = require("../utils/constants");
const { AuthenticationError } = require("../utils/errors");

class TokenService {
  /**
   * Generate Access Token (Short-lived)
   */
  static generateAccessToken(payload) {
    return jwt.sign(
      {
        user: {
          id: payload.id,
          email: payload.email,
          role: payload.role,
          tenantId: payload.tenantId,
        },
      },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN } // 15 minutes
    );
  }

  /**
 * Generate Refresh Token (Long-lived) - BACKWARD COMPATIBLE
 */
static async generateRefreshToken(userId, tenantId, ipAddress, userAgent) {
  // Generate secure random token
  const token = crypto.randomBytes(64).toString('hex');

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  // Store in database (handle missing tenantId for old users)
  const refreshToken = await RefreshToken.create({
    token,
    userId,
    tenantId: tenantId || null, // Allow null for backward compatibility
    expiresAt,
    ipAddress,
    userAgent,
  });

  return refreshToken.token;
}

  /**
   * Generate Token Pair (Access + Refresh)
   */
  static async generateTokenPair(user, ipAddress, userAgent) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(
      user._id,
      user.tenantId,
      ipAddress,
      userAgent
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Verify Access Token
   */
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new AuthenticationError("Access token expired");
      }
      throw new AuthenticationError("Invalid access token");
    }
  }

  /**
   * Verify Refresh Token
   */
  static async verifyRefreshToken(token) {
    const refreshToken = await RefreshToken.findValidToken(token);

    if (!refreshToken) {
      throw new AuthenticationError("Invalid or expired refresh token");
    }

    return refreshToken;
  }

  /**
   * Refresh Access Token
   */
  static async refreshAccessToken(refreshTokenString, ipAddress, userAgent) {
    // Verify refresh token
    const refreshToken = await this.verifyRefreshToken(refreshTokenString);

    // Get user
    const user = refreshToken.userId;

    // Generate new access token
    const accessToken = this.generateAccessToken({
      id: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    // Optionally rotate refresh token (recommended for security)
    const newRefreshToken = await this.rotateRefreshToken(
      refreshToken,
      ipAddress,
      userAgent
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    };
  }

  /**
   * Rotate Refresh Token (Security best practice)
   */
  static async rotateRefreshToken(oldToken, ipAddress, userAgent) {
    // Generate new refresh token
    const newToken = await this.generateRefreshToken(
      oldToken.userId._id,
      oldToken.tenantId,
      ipAddress,
      userAgent
    );

    // Revoke old token
    await oldToken.revoke("replaced");

    // Update with replacement reference
    oldToken.replacedBy = newToken._id;
    await oldToken.save();

    return newToken;
  }

  /**
   * Revoke Token
   */
  static async revokeToken(token, reason = "manual") {
    const refreshToken = await RefreshToken.findOne({ token });
    if (refreshToken) {
      await refreshToken.revoke(reason);
    }
  }

  /**
   * Revoke All User Tokens
   */
  static async revokeAllUserTokens(userId, reason = "security") {
    return await RefreshToken.revokeAllForUser(userId, reason);
  }

  /**
   * Generate Email Verification Token
   */
  static generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Generate Password Reset Token
   */
  static generatePasswordResetToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Hash Token (for storing in database)
   */
  static hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generate Invitation Token
   */
  static generateInvitationToken() {
    return crypto.randomBytes(32).toString("hex");
  }
}

module.exports = TokenService;
