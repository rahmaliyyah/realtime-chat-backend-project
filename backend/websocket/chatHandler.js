const url = require('url');
const cookie = require('cookie');
const Message = require('../models/Message');
const Room = require('../models/Room');
const { getRedisClient } = require('../config/redis');

const clients = new Map();

async function handleWebSocket(ws, req) {
  let currentRoomId = null;
  let userId = null;
  let username = null;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const redisClient = await getRedisClient();

      switch (message.type) {
        case 'auth':
          const cookies = cookie.parse(req.headers.cookie || '');
          const sessionId = cookies['connect.sid'];
          
          if (sessionId) {
            const sessionData = await redisClient.get(`sess:${sessionId.split('.')[0].substring(2)}`);
            if (sessionData) {
              const session = JSON.parse(sessionData);
              userId = session.userId;
              username = session.username;
              
              ws.send(JSON.stringify({
                type: 'auth_success',
                data: { userId, username }
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid session'
              }));
            }
          }
          break;

        case 'join_room':
          if (!userId) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Not authenticated'
            }));
            return;
          }

          currentRoomId = message.roomId;

          const room = await Room.findById(currentRoomId);
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Room not found'
            }));
            return;
          }

          if (!clients.has(currentRoomId)) {
            clients.set(currentRoomId, new Set());
          }
          clients.get(currentRoomId).add(ws);

          ws.send(JSON.stringify({
            type: 'joined_room',
            roomId: currentRoomId,
            roomName: room.name
          }));

          broadcastToRoom(currentRoomId, {
            type: 'user_joined',
            username: username,
            timestamp: new Date()
          }, ws);

          break;

        case 'chat_message':
          if (!currentRoomId || !userId) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Not in a room or not authenticated'
            }));
            return;
          }

          const newMessage = new Message({
            roomId: currentRoomId,
            userId: userId,
            username: username,
            content: message.content,
            timestamp: new Date()
          });

          await newMessage.save();

          const cacheKey = `room:${currentRoomId}:recent`;
          await redisClient.rPush(cacheKey, JSON.stringify(newMessage));
          
          const cacheSize = await redisClient.lLen(cacheKey);
          if (cacheSize > 100) {
            await redisClient.lTrim(cacheKey, -100, -1);
          }
          await redisClient.expire(cacheKey, 3600);

          broadcastToRoom(currentRoomId, {
            type: 'new_message',
            data: {
              _id: newMessage._id,
              roomId: newMessage.roomId,
              userId: newMessage.userId,
              username: newMessage.username,
              content: newMessage.content,
              timestamp: newMessage.timestamp
            }
          });

          break;

        case 'leave_room':
          if (currentRoomId) {
            clients.get(currentRoomId)?.delete(ws);
            broadcastToRoom(currentRoomId, {
              type: 'user_left',
              username: username,
              timestamp: new Date()
            }, ws);
            currentRoomId = null;
          }
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type'
          }));
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Server error'
      }));
    }
  });

  ws.on('close', () => {
    if (currentRoomId) {
      clients.get(currentRoomId)?.delete(ws);
      broadcastToRoom(currentRoomId, {
        type: 'user_left',
        username: username,
        timestamp: new Date()
      }, ws);
    }
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

function broadcastToRoom(roomId, message, excludeWs = null) {
  const roomClients = clients.get(roomId);
  if (!roomClients) return;

  const messageStr = JSON.stringify(message);
  roomClients.forEach(client => {
    if (client !== excludeWs && client.readyState === 1) {
      client.send(messageStr);
    }
  });
}

module.exports = { handleWebSocket };
