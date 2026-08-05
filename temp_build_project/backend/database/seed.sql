-- Demo password: Demo@123
INSERT INTO users (id, email, phone, full_name, password_hash, role, is_verified) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'demo@uber.com', '+1234567890', 'Alex Johnson', '$2b$12$EoEesjUcIH2koERJbsPZaepiYErz5rc0g.J4K7yCVvJPb8j4OJGc2', 'customer', TRUE),
  ('a0000000-0000-0000-0000-000000000002', 'sarah@uber.com', '+1234567891', 'Sarah Williams', '$2b$12$EoEesjUcIH2koERJbsPZaepiYErz5rc0g.J4K7yCVvJPb8j4OJGc2', 'driver', TRUE),
  ('a0000000-0000-0000-0000-000000000003', 'mike@uber.com', '+1234567892', 'Mike Chen', '$2b$12$EoEesjUcIH2koERJbsPZaepiYErz5rc0g.J4K7yCVvJPb8j4OJGc2', 'driver', TRUE),
  ('a0000000-0000-0000-0000-000000000004', 'jessica@uber.com', '+1234567893', 'Jessica Park', '$2b$12$EoEesjUcIH2koERJbsPZaepiYErz5rc0g.J4K7yCVvJPb8j4OJGc2', 'driver', TRUE);

INSERT INTO wallets (id, user_id, balance, currency) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 250.00, 'USD'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 1500.00, 'USD'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 890.00, 'USD'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 2100.00, 'USD');

INSERT INTO service_types (id, name, description, base_fare, per_km_rate, per_min_rate, min_fare, capacity) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Economy', 'Affordable everyday rides', 2.50, 1.20, 0.15, 5.00, 4),
  ('c0000000-0000-0000-0000-000000000002', 'Premium', 'Luxury vehicles for maximum comfort', 5.00, 2.50, 0.30, 10.00, 4),
  ('c0000000-0000-0000-0000-000000000003', 'XL', 'Extra space for groups and luggage', 4.00, 1.80, 0.25, 8.00, 6),
  ('c0000000-0000-0000-0000-000000000004', 'Delivery', 'Fast food and package delivery', 3.00, 1.00, 0.10, 4.00, 1);

INSERT INTO user_locations (id, user_id, name, address, latitude, longitude, is_favorite) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Home', '123 Main St, New York, NY', 40.7128, -74.0060, TRUE),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Work', '456 Oak Ave, New York, NY', 40.7580, -73.9855, TRUE);

INSERT INTO driver_availability (id, driver_id, is_online, latitude, longitude, vehicle_type, vehicle_color, vehicle_plate) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', TRUE, 40.7150, -74.0100, 'Toyota Camry', 'White', 'ABC-1234'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', TRUE, 40.7200, -74.0020, 'Honda Accord', 'Black', 'XYZ-5678'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', FALSE, 40.7250, -73.9900, 'Tesla Model 3', 'Red', 'TES-LA01');

INSERT INTO trips (id, customer_id, driver_id, service_type_id, status, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, pickup_address, dropoff_address, estimated_price, final_price, distance_km, duration_min, payment_method, payment_status, rating, review, requested_at, completed_at) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'completed', 40.7128, -74.0060, 40.7580, -73.9855, '123 Main St, New York, NY', '456 Oak Ave, New York, NY', 12.50, 14.20, 8.5, 18, 'wallet', 'completed', 5, 'Great ride!', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '30 minutes'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'completed', 40.7580, -73.9855, 40.7484, -73.9857, '456 Oak Ave, New York, NY', '789 Pine Rd, New York, NY', 25.00, 28.50, 12.0, 25, 'card', 'completed', 4, 'Comfortable ride', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '35 minutes');

INSERT INTO transactions (id, wallet_id, type, amount, balance_before, balance_after, reference, description, status) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'deposit', 100.00, 150.00, 250.00, 'REF-001', 'Wallet top-up', 'completed'),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'payment', -14.20, 264.20, 250.00, 'REF-002', 'Trip to 456 Oak Ave', 'completed');

INSERT INTO notifications (id, user_id, title, body, type, reference_id) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Welcome to Food Delivery!', 'Explore our services and enjoy your first ride.', 'system', NULL),
  ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Trip completed', 'Your trip to 456 Oak Ave cost $14.20', 'trip', 'f0000000-0000-0000-0000-000000000001');
