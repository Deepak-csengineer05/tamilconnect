/**
 * Migration Script: Initialize new fields for Feature 1-9 Upgrade
 * 
 * This script backfills all existing users with default values for:
 * - trustScore, trustLevel, badges, streakDays
 * - referralCode, referredBy, referralCount
 * - collegeName, campusVerified, likedUsers
 * - matchPreferences, safeMode, challengeProgress
 * 
 * Usage: node migrations/initializeNewFields.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const User = require('../models/User');

// Helper: Generate referral code from displayName + uid
function generateReferralCode(displayName, uid) {
  const namePrefix = displayName
    .split(' ')[0]
    .slice(0, 3)
    .toUpperCase();
  const uidSuffix = uid.slice(-4).toUpperCase();
  return `${namePrefix}${uidSuffix}`;
}

async function migrateUsers() {
  try {
    console.log('🚀 Starting migration...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/tamilconnect';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Fetch all users
    const allUsers = await User.find({});
    console.log(`📊 Found ${allUsers.length} users to migrate`);

    let updated = 0;
    let skipped = 0;

    for (const user of allUsers) {
      let needsUpdate = false;

      // Initialize trustScore if missing
      if (user.trustScore === undefined || user.trustScore === null) {
        user.trustScore = 100;
        needsUpdate = true;
      }

      // Initialize trustLevel if missing
      if (user.trustLevel === undefined || user.trustLevel === null) {
        user.trustLevel = 'new';
        needsUpdate = true;
      }

      // Initialize badges if missing
      if (!user.badges || user.badges.length === 0) {
        user.badges = [];
        needsUpdate = true;
      }

      // Initialize streakDays if missing
      if (user.streakDays === undefined || user.streakDays === null) {
        user.streakDays = 0;
        needsUpdate = true;
      }

      // Initialize referralCode if missing
      if (!user.referralCode) {
        user.referralCode = generateReferralCode(user.displayName || 'User', user.uid);
        needsUpdate = true;
      }

      // Initialize referredBy if missing
      if (!user.referredBy) {
        user.referredBy = null;
        needsUpdate = true;
      }

      // Initialize referralCount if missing
      if (user.referralCount === undefined || user.referralCount === null) {
        user.referralCount = 0;
        needsUpdate = true;
      }

      // Initialize collegeName if missing
      if (!user.collegeName) {
        user.collegeName = '';
        needsUpdate = true;
      }

      // Initialize campusVerified if missing
      if (user.campusVerified === undefined || user.campusVerified === null) {
        user.campusVerified = false;
        needsUpdate = true;
      }

      // Initialize likedUsers if missing
      if (!user.likedUsers || !Array.isArray(user.likedUsers)) {
        user.likedUsers = [];
        needsUpdate = true;
      }

      // Initialize matchPreferences if missing
      if (!user.matchPreferences) {
        user.matchPreferences = {
          mode: 'smart', // smart, districtOnly, nearbyDistricts, open
          strictInterests: false,
          sameDistrictOnly: false,
        };
        needsUpdate = true;
      }

      // Initialize safeMode if missing
      if (!user.safeMode) {
        user.safeMode = {
          enabled: false,
          faceBlur: false,
          voiceOnly: false,
          strictProfileFilter: false,
        };
        needsUpdate = true;
      }

      // Initialize challengeProgress if missing
      if (!user.challengeProgress) {
        user.challengeProgress = {
          matchesThisWeek: 0,
          distinctDistricts: 0,
          groupRoomsJoined: 0,
          lastCheckIn: null,
          streak: 0,
        };
        needsUpdate = true;
      }

      if (needsUpdate) {
        await user.save();
        updated++;
        console.log(
          `✓ Updated user: ${user.displayName} (referralCode: ${user.referralCode})`
        );
      } else {
        skipped++;
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   Users Updated: ${updated}`);
    console.log(`   Users Skipped: ${skipped}`);
    console.log(`   Total Processed: ${updated + skipped}`);

    await mongoose.connection.close();
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateUsers();
