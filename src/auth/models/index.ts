export * from './types.js';
export * from './user.repository.js';

// Create queries alias with method name mappings for backward compatibility
import { userRepository } from './user.repository.js';

export const queries = {
  // User queries
  getUserByEmail: userRepository.findByEmail.bind(userRepository),
  getUserById: userRepository.findById.bind(userRepository),
  createUser: userRepository.createUser.bind(userRepository),
  updateUserProfile: userRepository.updateProfile.bind(userRepository),
  updateLoginAttempts: userRepository.updateLoginAttempts.bind(userRepository),
  
  // Refresh token queries
  createRefreshToken: userRepository.createRefreshToken.bind(userRepository),
  getRefreshToken: userRepository.findRefreshToken.bind(userRepository),
  revokeRefreshToken: userRepository.revokeRefreshToken.bind(userRepository),
  revokeAllUserRefreshTokens: userRepository.revokeAllUserRefreshTokens.bind(userRepository),
  
  // Password reset queries
  createPasswordReset: userRepository.createPasswordReset.bind(userRepository),
  getPasswordReset: userRepository.findPasswordReset.bind(userRepository),
  markPasswordResetUsed: userRepository.markPasswordResetUsed.bind(userRepository)
}; 