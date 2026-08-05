const { Router } = require('express');
const { OTP, generateToken, authMiddleware } = require('../auth');
const { drivers } = require('../store');

const router = Router();

router.post('/otp/send', (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });
  console.log(`[OTP] Sent to ${phone}: ${OTP}`);
  res.json({ success: true, data: {}, message: 'OTP sent' });
});

router.post('/otp/verify', (req, res) => {
  const { phone, otp, fcm_token } = req.body || {};
  if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });
  if (otp !== OTP) return res.status(401).json({ success: false, message: 'Invalid OTP' });
  let driver = [...drivers.values()].find(d => d.phone === phone);
  const isNew = !driver;
  if (isNew) {
    const id = `driver_${Date.now()}`;
    driver = { id, full_name: null, phone, email: null, vehicle_type: null, vehicle_plate: null, photo_url: null, rating: 0, total_deliveries: 0, is_online: false, is_verified: true };
    drivers.set(id, driver);
  }
  const token = generateToken(driver.id);
  res.json({
    success: true,
    data: { token, driver_id: driver.id, full_name: driver.full_name, phone: driver.phone, email: driver.email, is_new: isNew },
    message: 'Verified',
  });
});

router.post('/profile', authMiddleware, (req, res) => {
  const driver = drivers.get(req.driverId);
  if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
  const { full_name, email, vehicle_type, vehicle_plate, photo_url } = req.body || {};
  if (full_name) driver.full_name = full_name;
  if (email !== undefined) driver.email = email;
  if (vehicle_type !== undefined) driver.vehicle_type = vehicle_type;
  if (vehicle_plate !== undefined) driver.vehicle_plate = vehicle_plate;
  if (photo_url !== undefined) driver.photo_url = photo_url;
  res.json({
    success: true,
    data: { token: null, driver_id: driver.id, full_name: driver.full_name, phone: driver.phone, email: driver.email, is_new: false },
  });
});

module.exports = router;
