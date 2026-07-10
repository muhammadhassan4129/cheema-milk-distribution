const express = require('express');
const { getRoutes, getMyRoutes, getRouteById, createRoute, updateRoute, assignMilkTesters, deleteRoute } = require('../controllers/route.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// Public debug route to inspect DB
router.get('/debug', async (req, res) => {
  try {
    const Route = require('../models/Route');
    const User = require('../models/User');
    const mongoose = require('mongoose');

    const routes = await Route.find({});
    const users = await User.find({});

    const testUserId = req.query.userId;
    let testResults = null;
    if (testUserId) {
      const userIdStr = testUserId.toString();
      const queryConditions = [
        { assignedMilkTesterIds: userIdStr }
      ];
      if (mongoose.Types.ObjectId.isValid(testUserId)) {
        queryConditions.push({ assignedMilkTesterIds: new mongoose.Types.ObjectId(userIdStr) });
      }
      
      const foundRoutes = await Route.find({
        $or: queryConditions
      });
      testResults = {
        testUserId,
        queryConditions,
        foundCount: foundRoutes.length,
        foundRoutes: foundRoutes.map(r => r.name)
      };
    }

    res.json({
      success: true,
      routes: routes.map(r => ({
        id: r._id,
        name: r.name,
        assignedMilkTesterIds: r.assignedMilkTesterIds,
        mtName: r.mtName,
        tankerNumber: r.tankerNumber
      })),
      users: users.map(u => ({
        id: u._id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        status: u.status
      })),
      testResults
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.use(protect);

// Milk tester assigned routes - /my-routes pehle rakho taki /:id match na ho
router.get('/my-routes', getMyRoutes);  // Driver ke liye - protect already hai

router.get('/', getRoutes);
router.get('/:id', getRouteById);
router.post('/', authorize('Admin'), createRoute);
router.patch('/:id/assign-testers', authorize('Admin'), assignMilkTesters);  // dedicated assign endpoint
router.put('/:id', authorize('Admin'), updateRoute);
router.delete('/:id', authorize('Admin'), deleteRoute);

module.exports = router;
