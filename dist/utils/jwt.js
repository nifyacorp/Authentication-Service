"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRefreshToken = exports.generateAccessToken = exports.generateEmailVerificationToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_js_1 = require("../config/jwt.js");
const generateEmailVerificationToken = async (sub, email) => {
    const secret = await (0, jwt_js_1.getJwtSecret)();
    return jsonwebtoken_1.default.sign({
        sub,
        email,
        type: 'email_verification'
    }, secret, { expiresIn: '24h' });
};
exports.generateEmailVerificationToken = generateEmailVerificationToken;
const generateAccessToken = async (sub, email, name, emailVerified = false) => {
    const secret = await (0, jwt_js_1.getJwtSecret)();
    return jsonwebtoken_1.default.sign({
        sub,
        email,
        name: name || email.split('@')[0],
        email_verified: emailVerified,
        type: 'access'
    }, secret, { expiresIn: jwt_js_1.ACCESS_TOKEN_EXPIRES_IN });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = async (sub, email) => {
    const secret = await (0, jwt_js_1.getJwtSecret)();
    return jsonwebtoken_1.default.sign({
        sub,
        email,
        type: 'refresh'
    }, secret, { expiresIn: jwt_js_1.REFRESH_TOKEN_EXPIRES_IN });
};
exports.generateRefreshToken = generateRefreshToken;
//# sourceMappingURL=jwt.js.map