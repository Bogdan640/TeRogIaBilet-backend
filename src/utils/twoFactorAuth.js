// src/utils/twoFactorAuth.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

function generateSecret(email) {
    const secret = speakeasy.generateSecret({
        name: `YourApp:${email}`
    });

    return {
        otpauth_url: secret.otpauth_url,
        base32: secret.base32
    };
}

async function generateQRCode(otpauthUrl) {
    try {
        return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
        console.error('Error generating QR code:', error);
        return null;
    }
}

function verifyToken(token, secret) {
    return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 1 // Allow 1 time step before/after (30 seconds each)
    });
}

module.exports = {
    generateSecret,
    generateQRCode,
    verifyToken
};