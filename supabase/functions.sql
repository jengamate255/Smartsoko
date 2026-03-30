-- Supabase Database Functions for Advanced Analytics and Business Logic

-- Function to get popular menu items
CREATE OR REPLACE FUNCTION get_popular_items(
  p_restaurant_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  item_price INTEGER,
  order_count BIGINT,
  total_revenue BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.id as item_id,
        mi.name as item_name,
        mi.price as item_price,
        COUNT(o.id)::BIGINT as order_count,
        SUM((item->>'quantity')::INTEGER * mi.price)::BIGINT as total_revenue
    FROM orders o,
    LATERAL jsonb_array_elements(o.items) AS item
    JOIN menu_items mi ON (item->>'id')::UUID = mi.id
    WHERE 
        o.status = 'delivered'
        AND (p_restaurant_id IS NULL OR o.restaurant_id = p_restaurant_id)
        AND mi.is_available = true
    GROUP BY mi.id, mi.name, mi.price
    ORDER BY order_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get peak ordering hours
CREATE OR REPLACE FUNCTION get_peak_hours(
  p_restaurant_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  hour_of_day INTEGER,
  order_count BIGINT,
  total_revenue BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(HOUR FROM created_at) as hour_of_day,
        COUNT(*)::BIGINT as order_count,
        SUM(total)::BIGINT as total_revenue
    FROM orders
    WHERE 
        created_at >= NOW() - INTERVAL '1 day' * p_days
        AND status = 'delivered'
        AND (p_restaurant_id IS NULL OR restaurant_id = p_restaurant_id)
    GROUP BY hour_of_day
    ORDER BY order_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer analytics
CREATE OR REPLACE FUNCTION get_customer_analytics(
  p_customer_id UUID
)
RETURNS TABLE (
  total_orders BIGINT,
  total_spent BIGINT,
  avg_order_value DECIMAL(10,2),
  favorite_item TEXT,
  order_frequency INTEGER,
  loyalty_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_orders,
        SUM(total)::BIGINT as total_spent,
        ROUND(AVG(total), 2) as avg_order_value,
        (SELECT mi.name 
         FROM orders o2,
         LATERAL jsonb_array_elements(o2.items) AS item
         JOIN menu_items mi ON (item->>'id')::UUID = mi.id
         WHERE o2.customer_id = p_customer_id AND o2.status = 'delivered'
         GROUP BY mi.id 
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as favorite_item,
        EXTRACT(DAYS FROM MIN(created_at))::INTEGER as order_frequency,
        COALESCE((SELECT SUM(points_earned) - SUM(points_spent) 
                  FROM loyalty_points 
                  WHERE customer_id = p_customer_id 
                  AND transaction_type = 'earned'), 0) as loyalty_points
    FROM orders
    WHERE 
        customer_id = p_customer_id
        AND status = 'delivered';
END;
$$ LANGUAGE plpgsql;

-- Function to get driver analytics
CREATE OR REPLACE FUNCTION get_driver_analytics(
  p_driver_id UUID
)
RETURNS TABLE (
  total_deliveries BIGINT,
  total_earnings BIGINT,
  avg_delivery_time INTEGER,
  avg_rating DECIMAL(3,2),
  current_streak INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_deliveries,
        COALESCE(SUM(total_earnings), 0)::BIGINT as total_earnings,
        COALESCE(ROUND(AVG(
            EXTRACT(EPOCH FROM (actual_delivery_time - created_at))/60
        ), 0), 0) as avg_delivery_time,
        COALESCE(AVG(rating), 0) as avg_rating,
        (SELECT COUNT(*) 
         FROM orders o3 
         WHERE o3.driver_id = p_driver_id 
         AND o3.status = 'delivered'
         AND o3.created_at >= CURRENT_DATE - INTERVAL '1 day' * 
            CASE 
                WHEN EXTRACT(DOW FROM CURRENT_DATE) = 1 THEN 7 -- Monday
                ELSE EXTRACT(DOW FROM CURRENT_DATE) - 1
            END
        ) as current_streak
    FROM orders o
    LEFT JOIN reviews r ON o.id = r.order_id
    WHERE 
        o.driver_id = p_driver_id
        AND o.status = 'delivered';
END;
$$ LANGUAGE plpgsql;

-- Function to get restaurant analytics
CREATE OR REPLACE FUNCTION get_restaurant_analytics(
  p_restaurant_id UUID
)
RETURNS TABLE (
  total_orders BIGINT,
  total_revenue BIGINT,
  avg_order_value DECIMAL(10,2),
  active_menu_items INTEGER,
  low_stock_items INTEGER,
  customer_retention_rate DECIMAL(5,2),
  avg_rating DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::BIGINT FROM orders WHERE restaurant_id = p_restaurant_id) as total_orders,
        (SELECT COALESCE(SUM(total), 0)::BIGINT FROM orders WHERE restaurant_id = p_restaurant_id AND status = 'delivered') as total_revenue,
        (SELECT COALESCE(ROUND(AVG(total), 2), 0) FROM orders WHERE restaurant_id = p_restaurant_id AND status = 'delivered') as avg_order_value,
        (SELECT COUNT(*)::INTEGER FROM menu_items WHERE restaurant_id = p_restaurant_id AND is_available = true) as active_menu_items,
        (SELECT COUNT(*)::INTEGER FROM menu_items WHERE restaurant_id = p_restaurant_id AND stock < 10 AND stock > 0) as low_stock_items,
        (SELECT 
            CASE 
                WHEN COUNT(DISTINCT customer_id) = 0 THEN 0
                ELSE ROUND(
                    (COUNT(DISTINCT CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN customer_id END) * 100.0 / 
                    COUNT(DISTINCT customer_id)), 2
                END
         FROM orders 
         WHERE restaurant_id = p_restaurant_id AND status = 'delivered'
        ) as customer_retention_rate,
        (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE restaurant_id = p_restaurant_id) as avg_rating;
END;
$$ LANGUAGE plpgsql;

-- Function to check if location is in delivery zone
CREATE OR REPLACE FUNCTION is_in_delivery_zone(
  p_restaurant_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
    zone_record RECORD;
BEGIN
    SELECT * INTO zone_record 
    FROM delivery_zones 
    WHERE restaurant_id = p_restaurant_id AND is_active = true
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if point is within polygon using PostGIS (if available) or simple bounding box
    RETURN ST_Within(
        ST_MakePoint(p_longitude, p_latitude),
        zone_record.polygon
    );
    
EXCEPTION
    WHEN undefined_function THEN
        -- Fallback to simple distance check if PostGIS not available
        DECLARE
            restaurant RECORD;
        BEGIN
            SELECT * INTO restaurant FROM restaurants WHERE id = p_restaurant_id;
            IF NOT FOUND THEN
                RETURN FALSE;
            END IF;
            
            -- Simple 10km radius check
            RETURN (
                6371 * ACOS(
                    COS(RADIANS(restaurant.latitude)) * COS(RADIANS(p_latitude)) * 
                    COS(RADIANS(p_longitude - p_longitude)) + 
                    SIN(RADIANS(restaurant.latitude)) * SIN(RADIANS(p_latitude))
                ) <= 10
            );
        END;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate delivery fee based on zone
CREATE OR REPLACE FUNCTION calculate_delivery_fee(
  p_restaurant_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_order_total INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
    zone_record RECORD;
    base_fee INTEGER;
BEGIN
    SELECT * INTO zone_record 
    FROM delivery_zones 
    WHERE restaurant_id = p_restaurant_id 
    AND is_active = true
    AND ST_Within(
        ST_MakePoint(p_longitude, p_latitude),
        zone_record.polygon
    )
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- Return restaurant's default delivery fee
        SELECT COALESCE(delivery_fee, 0) INTO base_fee
        FROM restaurants 
        WHERE id = p_restaurant_id;
        RETURN base_fee;
    END IF;
    
    -- Check if order qualifies for free delivery
    IF zone_record.free_delivery_above > 0 AND p_order_total >= zone_record.free_delivery_above THEN
        RETURN 0;
    END IF;
    
    RETURN zone_record.base_delivery_fee;
END;
$$ LANGUAGE plpgsql;

-- Function to get nearby drivers
CREATE OR REPLACE FUNCTION get_nearby_drivers(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_km INTEGER DEFAULT 5,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  driver_id UUID,
  driver_name TEXT,
  driver_phone TEXT,
  distance_km DECIMAL(8,2),
  vehicle_type TEXT,
  rating DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.profile_id as driver_id,
        p.name as driver_name,
        p.phone as driver_phone,
        (6371 * ACOS(
            COS(RADIANS(d.current_latitude)) * COS(RADIANS(p_latitude)) * 
            COS(RADIANS(d.current_longitude - p_longitude)) + 
            SIN(RADIANS(d.current_latitude)) * SIN(RADIANS(p_latitude))
        )) as distance_km,
        d.vehicle_type,
        d.rating
    FROM drivers d
    JOIN profiles p ON d.profile_id = p.id
    WHERE 
        d.status = 'online'
        AND d.current_order_id IS NULL
        AND d.current_latitude IS NOT NULL
        AND d.current_longitude IS NOT NULL
        AND (6371 * ACOS(
            COS(RADIANS(d.current_latitude)) * COS(RADIANS(p_latitude)) * 
            COS(RADIANS(d.current_longitude - p_longitude)) + 
            SIN(RADIANS(d.current_latitude)) * SIN(RADIANS(p_latitude))
        )) <= p_radius_km
    ORDER BY distance_km
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign driver to order
CREATE OR REPLACE FUNCTION auto_assign_driver(
  p_order_id UUID
)
RETURNS UUID AS $$
DECLARE
    order_record RECORD;
    restaurant_record RECORD;
    assigned_driver_id UUID;
BEGIN
    -- Get order details
    SELECT * INTO order_record FROM orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Get restaurant location
    SELECT * INTO restaurant_record FROM restaurants WHERE id = order_record.restaurant_id;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Find nearest available driver
    SELECT driver_id INTO assigned_driver_id
    FROM get_nearby_drivers(
        order_record.delivery_latitude,
        order_record.delivery_longitude,
        10, -- 10km radius
        1
    )
    LIMIT 1;
    
    -- Update order with assigned driver
    IF assigned_driver_id IS NOT NULL THEN
        UPDATE orders SET 
            driver_id = assigned_driver_id,
            status = 'dispatched',
            updated_at = NOW()
        WHERE id = p_order_id;
        
        -- Update driver status
        UPDATE drivers SET 
            current_order_id = p_order_id,
            status = 'busy',
            updated_at = NOW()
        WHERE profile_id = assigned_driver_id;
    END IF;
    
    RETURN assigned_driver_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate daily sales report
CREATE OR REPLACE FUNCTION generate_daily_sales_report(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  restaurant_id UUID,
  restaurant_name TEXT,
  total_orders BIGINT,
  total_revenue BIGINT,
  avg_order_value DECIMAL(10,2),
  peak_hour INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.restaurant_id,
        r.name as restaurant_name,
        COUNT(*)::BIGINT as total_orders,
        COALESCE(SUM(o.total), 0)::BIGINT as total_revenue,
        COALESCE(ROUND(AVG(o.total), 2), 0) as avg_order_value,
        (SELECT EXTRACT(HOUR FROM created_at)
         FROM orders o2 
         WHERE o2.restaurant_id = o.restaurant_id 
         AND DATE(o2.created_at) = p_date
         GROUP BY EXTRACT(HOUR FROM created_at)
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as peak_hour
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.id
    WHERE 
        DATE(o.created_at) = p_date
        AND o.status = 'delivered'
    GROUP BY o.restaurant_id, r.name
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate restaurant rating
CREATE OR REPLACE FUNCTION update_restaurant_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE restaurants 
    SET rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM reviews 
        WHERE restaurant_id = NEW.restaurant_id
    )
    WHERE id = NEW.restaurant_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_restaurant_rating_trigger
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_restaurant_rating();

-- Trigger to update driver statistics
CREATE OR REPLACE FUNCTION update_driver_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        UPDATE drivers SET 
            total_deliveries = total_deliveries + 1,
            total_earnings = total_earnings + COALESCE(NEW.total, 0),
            updated_at = NOW()
        WHERE profile_id = NEW.driver_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_stats_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_driver_stats();

-- Function to clean up expired loyalty points
CREATE OR REPLACE FUNCTION cleanup_expired_loyalty_points()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM loyalty_points 
    WHERE expires_at < NOW() 
    AND points_earned > points_spent;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create index for better performance on JSON operations
CREATE INDEX idx_orders_items_gin ON orders USING GIN (items);

-- Create index for location-based queries
CREATE INDEX idx_drivers_location_gist ON drivers USING GIST (
    ST_MakePoint(current_longitude, current_latitude)
);

-- Create index for delivery zones
CREATE INDEX idx_delivery_zones_gist ON delivery_zones USING GIST (polygon);
