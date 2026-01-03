const Room = require('../models/Room');

/**
 * Clean up expired rooms
 * Rooms are deleted if:
 * 1. autoDeleteAt is set and has passed
 * 2. Room has 0 players (completely empty)
 * 
 * Rooms with >= 1 player persist indefinitely
 */
const cleanupExpiredRooms = async () => {
  try {
    const now = new Date();
    
    // Find and delete expired empty rooms (0 players only)
    const expiredRooms = await Room.find({
      autoDeleteAt: { $lte: now },
      $expr: { $eq: [{ $size: '$players' }, 0] }  // Only 0 players
    });

    if (expiredRooms.length > 0) {
      const roomIds = expiredRooms.map(r => r._id);
      await Room.deleteMany({ _id: { $in: roomIds } });
      console.log(`🗑️  Deleted ${expiredRooms.length} expired empty room(s)`);
    }
  } catch (error) {
    console.error('Cleanup expired rooms error:', error);
  }
};

/**
 * Start the cleanup interval (runs every 30 seconds)
 */
const startRoomCleanup = () => {
  // Run immediately on startup
  cleanupExpiredRooms();
  
  // Then run every 30 seconds
  setInterval(cleanupExpiredRooms, 30 * 1000);
  
  console.log('✅ Room cleanup service started (runs every 30 seconds)');
};

module.exports = {
  cleanupExpiredRooms,
  startRoomCleanup
};
