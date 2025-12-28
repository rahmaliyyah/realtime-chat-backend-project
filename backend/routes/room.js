const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Not authenticated' 
    });
  }
};

router.post('/', isAuthenticated, roomController.createRoom);
router.get('/', isAuthenticated, roomController.getRooms);
router.post('/:roomId/join', isAuthenticated, roomController.joinRoom);
router.get('/:roomId/messages', isAuthenticated, roomController.getMessages);

module.exports = router;
