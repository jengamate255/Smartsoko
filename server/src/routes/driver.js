const { Router } = require('express');
const { authMiddleware } = require('../auth');
const { drivers, earnings } = require('../store');

const router = Router();

router.get('/profile', authMiddleware, (req, res) => {
  const driver = drivers.get(req.driverId);
  if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
  res.json({
    success: true,
    data: {
      token: null,
      driver_id: driver.id,
      full_name: driver.full_name,
      phone: driver.phone,
      email: driver.email,
      is_new: !driver.full_name,
    },
  });
});

router.get('/earnings', authMiddleware, (req, res) => {
  const e = earnings.get(req.driverId) || { today_amount: 0, today_deliveries: 0, weekly_amount: 0, weekly_deliveries: 0, daily_breakdown: [] };
  res.json({ success: true, data: e });
});

module.exports = router;
