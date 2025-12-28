const Room = require('../models/Room');
const Message = require('../models/Message');
const { getRedisClient } = require('../config/redis');

exports.createRoom = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.session.userId;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Room name is required' 
      });
    }

    const room = new Room({
      name,
      description: description || '',
      createdBy: userId,
      members: [userId]
    });

    await room.save();

    res.status(201).json({ 
      success: true, 
      message: 'Room created successfully',
      data: room
    });

  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      data: rooms 
    });

  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.session.userId;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ 
        success: false, 
        message: 'Room not found' 
      });
    }

    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await room.save();
    }

    res.json({ 
      success: true, 
      message: 'Joined room successfully',
      data: room
    });

  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    
    const redisClient = await getRedisClient();
    const cacheKey = `room:${roomId}:recent`;

    const cachedMessages = await redisClient.lRange(cacheKey, 0, parseInt(limit) - 1);
    
    if (cachedMessages.length >= parseInt(limit)) {
      console.log('✅ Cache HIT - Retrieved from Redis');
      return res.json({ 
        success: true, 
        data: cachedMessages.map(msg => JSON.parse(msg)),
        source: 'cache'
      });
    }

    console.log('❌ Cache MISS - Fetching from MongoDB');
    
    const query = { roomId };
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    if (messages.length > 0 && !before) {
      await redisClient.del(cacheKey);
      const messagesToCache = messages.slice(0, 100).reverse();
      
      for (const msg of messagesToCache) {
        await redisClient.rPush(cacheKey, JSON.stringify(msg));
      }
      
      await redisClient.expire(cacheKey, 3600);
    }

    res.json({ 
      success: true, 
      data: messages.reverse(),
      source: 'database'
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};
