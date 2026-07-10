const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Model
 * Frontend: UserContext.tsx ke User interface ke barabar
 * Roles: Admin | MilkTester | Accountant
 */
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // default mein password return nahi hoga
    },
    phone: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['Admin', 'MilkTester', 'Accountant', 'Driver'],
      required: [true, 'Role is required'],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    cnic: {
      type: String,
      default: '',
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      sidebarCollapsed: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Password save se pehle hash karo
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Password compare method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Response mein password hatao
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
