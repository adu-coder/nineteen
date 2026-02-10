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
    const { title, amount, tags, description, date, isExpense } = req.body;

    if (!title || amount === undefined || isExpense === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transaction = new Transaction({
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

    if (!friend.shareWithFriends) {
      return res.status(403).json({ error: 'Friend has not enabled sharing' });
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

module.exports = router;
