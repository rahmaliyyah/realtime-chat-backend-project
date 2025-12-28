const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

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

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', isAuthenticated, authController.logout);
router.get('/profile', isAuthenticated, authController.getProfile);

module.exports = router;
