// services/encryption.js
const crypto = require('crypto');

// Constants
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16
const KEY_LENGTH = 32; // 256 bits

// Key management
let currentKey = null;

// Ensure the key is exactly 32 bytes (256 bits)
function getKey() {
  if (currentKey) return currentKey;

  let key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.error('WARNING: No ENCRYPTION_KEY found in environment variables. Using a temporary key (not secure for production)');
    key = 'temporary_insecure_key_32_bytes_long_123'; // Fallback for development
  }
  
  // Create a hash of the key to ensure it's exactly 32 bytes
  const hash = crypto.createHash('sha256');
  hash.update(key);
  currentKey = hash.digest();
  
  return currentKey;
}

// Clear the cached key (useful for testing)
function clearKeyCache() {
  currentKey = null;
}

function encrypt(text) {
  if (!text) return null;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine IV and encrypted data
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

function decrypt(encryptedData) {
  if (!encryptedData) {
    console.error('No encrypted data provided to decrypt');
    return null;
  }
  
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      console.error('Invalid encrypted data format: expected IV:encryptedData');
      return null;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    if (iv.length !== IV_LENGTH) {
      console.error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length}`);
      return null;
    }
    
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = '';
    try {
      decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
    } catch (decryptError) {
      if (decryptError.code === 'ERR_OSSL_BAD_DECRYPT') {
        console.error('Failed to decrypt data. The encryption key may have changed or the data is corrupted.');
      } else {
        console.error('Decryption failed:', decryptError.message);
      }
      return null;
    }
    
    return decrypted;
  } catch (error) {
    console.error('Unexpected error during decryption:', error.message);
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt
};