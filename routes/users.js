const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get or create user (Google Sign-In)
router.post('/auth/google', async (req, res) => {
  try {
    const { email, displayName, photoUrl, googleId } = req.body;

    if (!email || !displayName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = new User({
        email: email.toLowerCase(),
        displayName,
        photoUrl: photoUrl || '',
        googleId: googleId || null
      });
      await user.save();
    } else {
      // Update user info
      user.displayName = displayName;
      user.photoUrl = photoUrl || user.photoUrl;
      user.googleId = googleId || user.googleId;
      user.lastActiveAt = new Date();
      await user.save();
    }

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
        friendIds: user.friendIds.map(id => id.toString()),
        shareWithFriends: user.shareWithFriends
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

// Get user profile
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
      friendIds: user.friendIds.map(id => id.toString()),
      shareWithFriends: user.shareWithFriends
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user', details: error.message });
  }
});

// Update user profile
router.put('/users/:userId', async (req, res) => {
  try {
    const { displayName, photoUrl, shareWithFriends } = req.body;
    
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (displayName) user.displayName = displayName;
    if (photoUrl !== undefined) user.photoUrl = photoUrl;
    if (shareWithFriends !== undefined) user.shareWithFriends = shareWithFriends;
    
    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
        friendIds: user.friendIds.map(id => id.toString()),
        shareWithFriends: user.shareWithFriends
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// Search user by email
router.get('/users/search/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl
    });
  } catch (error) {
    console.error('Search user error:', error);
    res.status(500).json({ error: 'Failed to search user', details: error.message });
  }
});

// Send friend request
router.post('/users/:userId/friends', async (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    if (friendId === req.params.userId) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    const user = await User.findById(req.params.userId);
    const friend = await User.findById(friendId);

    if (!user || !friend) {
      return res.status(404).json({ error: 'User or friend not found' });
    }

    const alreadyFriends = user.friendIds.some(id => id.toString() === friendId);
    const alreadyRequested = user.friendRequestsSent.some(id => id.toString() === friendId);
    const alreadyReceived = user.friendRequestsReceived.some(id => id.toString() === friendId);

    if (alreadyFriends) {
      return res.status(400).json({ error: 'Already friends' });
    }

    if (alreadyRequested || alreadyReceived) {
      return res.status(400).json({ error: 'Friend request already pending' });
    }

    user.friendRequestsSent.push(friendId);
    friend.friendRequestsReceived.push(req.params.userId);

    await user.save();
    await friend.save();

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request', details: error.message });
  }
});

// Get incoming friend requests
router.get('/users/:userId/friend-requests', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const requesters = await User.find({ _id: { $in: user.friendRequestsReceived } });

    res.json({
      requests: requesters.map(requester => ({
        id: requester._id.toString(),
        email: requester.email,
        displayName: requester.displayName,
        photoUrl: requester.photoUrl
      }))
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Failed to get friend requests', details: error.message });
  }
});

// Accept friend request
router.post('/users/:userId/friend-requests/:requesterId/accept', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const requester = await User.findById(req.params.requesterId);

    if (!user || !requester) {
      return res.status(404).json({ error: 'User or requester not found' });
    }

    const hasRequest = user.friendRequestsReceived.some(
      id => id.toString() === req.params.requesterId
    );

    if (!hasRequest) {
      return res.status(400).json({ error: 'No pending request from this user' });
    }

    user.friendRequestsReceived = user.friendRequestsReceived.filter(
      id => id.toString() !== req.params.requesterId
    );
    requester.friendRequestsSent = requester.friendRequestsSent.filter(
      id => id.toString() !== req.params.userId
    );

    if (!user.friendIds.some(id => id.toString() === req.params.requesterId)) {
      user.friendIds.push(req.params.requesterId);
    }

    if (!requester.friendIds.some(id => id.toString() === req.params.userId)) {
      requester.friendIds.push(req.params.userId);
    }

    await user.save();
    await requester.save();

    res.json({
      success: true,
      friendIds: user.friendIds.map(id => id.toString())
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Failed to accept friend request', details: error.message });
  }
});

// Decline friend request
router.post('/users/:userId/friend-requests/:requesterId/decline', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const requester = await User.findById(req.params.requesterId);

    if (!user || !requester) {
      return res.status(404).json({ error: 'User or requester not found' });
    }

    user.friendRequestsReceived = user.friendRequestsReceived.filter(
      id => id.toString() !== req.params.requesterId
    );
    requester.friendRequestsSent = requester.friendRequestsSent.filter(
      id => id.toString() !== req.params.userId
    );

    await user.save();
    await requester.save();

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Decline friend request error:', error);
    res.status(500).json({ error: 'Failed to decline friend request', details: error.message });
  }
});

// Remove friend
router.delete('/users/:userId/friends/:friendId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.friendIds = user.friendIds.filter(id => id.toString() !== req.params.friendId);
    await user.save();

    // Optionally remove reciprocal friendship
    const friend = await User.findById(req.params.friendId);
    if (friend) {
      friend.friendIds = friend.friendIds.filter(id => id.toString() !== req.params.userId);
      await friend.save();
    }

    res.json({
      success: true,
      friendIds: user.friendIds.map(id => id.toString())
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend', details: error.message });
  }
});

// Get friends
router.get('/users/:userId/friends', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const friends = await User.find({ _id: { $in: user.friendIds } });

    res.json({
      friends: friends.map(friend => ({
        id: friend._id.toString(),
        email: friend.email,
        displayName: friend.displayName,
        photoUrl: friend.photoUrl,
        shareWithFriends: friend.shareWithFriends
      }))
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends', details: error.message });
  }
});

module.exports = router;
