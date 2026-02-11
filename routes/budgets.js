const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// Get all budgets for a user
router.get('/users/:userId/budgets', async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.params.userId });
    
    const budgetsWithSpending = await Promise.all(budgets.map(async (budget) => {
      // Calculate spending for this budget's category
      const now = new Date();
      let startDate;
      
      if (budget.period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (budget.period === 'weekly') {
        const day = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      const transactions = await Transaction.find({
        userId: req.params.userId,
        isExpense: true,
        tags: budget.category,
        date: { $gte: startDate, $lte: now }
      });

      const spent = transactions.reduce((sum, t) => sum + t.amount, 0);

      return {
        id: budget._id.toString(),
        userId: budget.userId.toString(),
        category: budget.category,
        amount: budget.amount,
        period: budget.period,
        startDate: budget.startDate,
        isActive: budget.isActive,
        spent: spent,
        remaining: budget.amount - spent,
        percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0
      };
    }));

    res.json({ budgets: budgetsWithSpending });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Failed to get budgets', details: error.message });
  }
});

// Create a new budget
router.post('/users/:userId/budgets', async (req, res) => {
  try {
    const { category, amount, period } = req.body;

    if (!category || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid budget data' });
    }

    // Check if budget already exists for this category
    const existing = await Budget.findOne({
      userId: req.params.userId,
      category: category,
      isActive: true
    });

    if (existing) {
      return res.status(400).json({ error: 'Budget already exists for this category' });
    }

    const budget = new Budget({
      userId: req.params.userId,
      category,
      amount,
      period: period || 'monthly',
      startDate: new Date(),
      isActive: true
    });

    await budget.save();

    res.status(201).json({
      success: true,
      budget: {
        id: budget._id.toString(),
        userId: budget.userId.toString(),
        category: budget.category,
        amount: budget.amount,
        period: budget.period,
        startDate: budget.startDate,
        isActive: budget.isActive,
        spent: 0,
        remaining: budget.amount,
        percentage: 0
      }
    });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Failed to create budget', details: error.message });
  }
});

// Update a budget
router.put('/budgets/:budgetId', async (req, res) => {
  try {
    const { category, amount, period, isActive } = req.body;
    
    const budget = await Budget.findById(req.params.budgetId);
    
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    if (category) budget.category = category;
    if (amount !== undefined) budget.amount = amount;
    if (period) budget.period = period;
    if (isActive !== undefined) budget.isActive = isActive;
    
    await budget.save();

    res.json({
      success: true,
      budget: {
        id: budget._id.toString(),
        userId: budget.userId.toString(),
        category: budget.category,
        amount: budget.amount,
        period: budget.period,
        startDate: budget.startDate,
        isActive: budget.isActive
      }
    });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ error: 'Failed to update budget', details: error.message });
  }
});

// Delete a budget
router.delete('/budgets/:budgetId', async (req, res) => {
  try {
    const budget = await Budget.findByIdAndDelete(req.params.budgetId);
    
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ error: 'Failed to delete budget', details: error.message });
  }
});

module.exports = router;
