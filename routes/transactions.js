const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Get all transactions for a user
router.get('/users/:userId/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.params.userId })
      .sort({ date: -1 })
      .limit(1000);

    res.json({
      transactions: transactions.map(t => ({
        id: t._id.toString(),
        title: t.title,
        amount: t.amount,
        tags: t.tags,
        description: t.description,
        date: t.date.toISOString(),
        isExpense: t.isExpense
      }))
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions', details: error.message });
  }
});

// Create transaction
router.post('/users/:userId/transactions', async (req, res) => {
  try {
    const { id, title, amount, tags, description, date, isExpense } = req.body;

    if (!title || amount === undefined || isExpense === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (id) {
      const existing = await Transaction.findOne({
        _id: id,
        userId: req.params.userId
      });

      if (existing) {
        return res.status(200).json({
          success: true,
          transaction: {
            id: existing._id.toString(),
            title: existing.title,
            amount: existing.amount,
            tags: existing.tags,
            description: existing.description,
            date: existing.date.toISOString(),
            isExpense: existing.isExpense
          }
        });
      }
    }

    const transaction = new Transaction({
      _id: id || new Date().getTime().toString(),
      userId: req.params.userId,
      title,
      amount,
      tags: tags || [],
      description: description || '',
      date: date ? new Date(date) : new Date(),
      isExpense
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      transaction: {
        id: transaction._id.toString(),
        title: transaction.title,
        amount: transaction.amount,
        tags: transaction.tags,
        description: transaction.description,
        date: transaction.date.toISOString(),
        isExpense: transaction.isExpense
      }
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction', details: error.message });
  }
});

// Update transaction
router.put('/users/:userId/transactions/:transactionId', async (req, res) => {
  try {
    const { title, amount, tags, description, date, isExpense } = req.body;

    const transaction = await Transaction.findOne({
      _id: req.params.transactionId,
      userId: req.params.userId
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (title) transaction.title = title;
    if (amount !== undefined) transaction.amount = amount;
    if (tags) transaction.tags = tags;
    if (description !== undefined) transaction.description = description;
    if (date) transaction.date = new Date(date);
    if (isExpense !== undefined) transaction.isExpense = isExpense;
    transaction.updatedAt = new Date();

    await transaction.save();

    res.json({
      success: true,
      transaction: {
        id: transaction._id.toString(),
        title: transaction.title,
        amount: transaction.amount,
        tags: transaction.tags,
        description: transaction.description,
        date: transaction.date.toISOString(),
        isExpense: transaction.isExpense
      }
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction', details: error.message });
  }
});

// Delete transaction
router.delete('/users/:userId/transactions/:transactionId', async (req, res) => {
  try {
    const result = await Transaction.deleteOne({
      _id: req.params.transactionId,
      userId: req.params.userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction', details: error.message });
  }
});

// Get friend's transactions (if sharing is enabled)
router.get('/users/:userId/friends/:friendId/transactions', async (req, res) => {
  try {
    const friend = await User.findById(req.params.friendId);
    
    if (!friend) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    const isFriend = friend.friendIds.some(
      id => id.toString() === req.params.userId
    );

    if (!isFriend) {
      return res.status(403).json({ error: 'Friendship not approved' });
    }

    // Check granular permission: is requesting user in transactionShareFriendIds?
    const hasPermission = (friend.transactionShareFriendIds || []).some(
      id => id.toString() === req.params.userId
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Friend has not shared transactions with you' });
    }

    const transactions = await Transaction.find({ userId: req.params.friendId })
      .sort({ date: -1 })
      .limit(50);

    res.json({
      transactions: transactions.map(t => ({
        id: t._id.toString(),
        title: t.title,
        amount: t.amount,
        tags: t.tags,
        description: t.description,
        date: t.date.toISOString(),
        isExpense: t.isExpense
      }))
    });
  } catch (error) {
    console.error('Get friend transactions error:', error);
    res.status(500).json({ error: 'Failed to get friend transactions', details: error.message });
  }
});

// Get friend's balance (if sharing is enabled)
router.get('/users/:userId/friends/:friendId/balance', async (req, res) => {
  try {
    const friend = await User.findById(req.params.friendId);
    
    if (!friend) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    const isFriend = friend.friendIds.some(
      id => id.toString() === req.params.userId
    );

    if (!isFriend) {
      return res.status(403).json({ error: 'Friendship not approved' });
    }

    // Check granular permission: is requesting user in balanceShareFriendIds?
    const hasPermission = (friend.balanceShareFriendIds || []).some(
      id => id.toString() === req.params.userId
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Friend has not shared balance with you' });
    }

    // Calculate balance
    const transactions = await Transaction.find({ userId: req.params.friendId });
    
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.isExpense) {
        totalExpense += t.amount;
      } else {
        totalIncome += t.amount;
      }
    });

    const balance = totalIncome - totalExpense;

    res.json({
      balance,
      totalIncome,
      totalExpense
    });
  } catch (error) {
    console.error('Get friend balance error:', error);
    res.status(500).json({ error: 'Failed to get friend balance', details: error.message });
  }
});

// Get friend's analytics (if sharing is enabled)
router.get('/users/:userId/friends/:friendId/analytics', async (req, res) => {
  try {
    const friend = await User.findById(req.params.friendId);
    
    if (!friend) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    const isFriend = friend.friendIds.some(
      id => id.toString() === req.params.userId
    );

    if (!isFriend) {
      return res.status(403).json({ error: 'Friendship not approved' });
    }

    // Check if friend has enabled analytics sharing for all friends
    if (!friend.analyticsShareEnabled) {
      return res.status(403).json({ error: 'Friend has not shared analytics' });
    }

    // Get all expenses and calculate breakdown by tag
    const transactions = await Transaction.find({ 
      userId: req.params.friendId,
      isExpense: true 
    });

    const tagTotals = {};
    let totalExpense = 0;

    transactions.forEach(t => {
      totalExpense += t.amount;
      t.tags.forEach(tag => {
        tagTotals[tag] = (tagTotals[tag] || 0) + t.amount;
      });
    });

    // Convert to percentages
    const tagPercentages = {};
    Object.keys(tagTotals).forEach(tag => {
      tagPercentages[tag] = totalExpense > 0 
        ? Math.round((tagTotals[tag] / totalExpense) * 100) 
        : 0;
    });

    res.json({
      tagPercentages,
      totalExpense: totalExpense // Amount is included but can be hidden on frontend if needed
    });
  } catch (error) {
    console.error('Get friend analytics error:', error);
    res.status(500).json({ error: 'Failed to get friend analytics', details: error.message });
  }
});

module.exports = router;
