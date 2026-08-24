const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

const clientSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, },
    lastName: { type: String, required: true, trim: true, },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, },
    password: { type: String, required: true, select: false, },
    passwordChangedAt: { type: Date, default: null, select: false, },
    role: { type: String, default: "client", required: true, },
    isEmailVerified: { type: Boolean, default: false, },
    emailVerifiedAt: { type: Date, default: null, },
  },
  { timestamps: true, versionKey: false, collection: "clients", }
);

clientSchema.pre("save", async function () {
  //  This check is important to avoid re-hashing the password if it hasn't changed
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

clientSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;

  return bcrypt.compare(candidatePassword, this.password);
};
// Prevent OverwriteModelError

const Client = mongoose.models.Client || mongoose.model("Client", clientSchema);

module.exports = Client;
