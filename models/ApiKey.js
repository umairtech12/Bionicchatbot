// models/ApiKey.js
const mongoose = require("mongoose");
const CryptoJS = require("crypto-js");

const apiKeySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  key: {
    type: String,
    required: true,
    unique: true,
    set: (value) => CryptoJS.AES.encrypt(value, process.env.SECRET_KEY).toString(),
  },
});

// Decrypt the API key
apiKeySchema.methods.getDecryptedKey = function () {
  const bytes = CryptoJS.AES.decrypt(this.key, process.env.SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = mongoose.model("ApiKey", apiKeySchema);