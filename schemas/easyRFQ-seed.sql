-- Insert into companies (with address info)
INSERT INTO companies (name, address_line1, address_line2, city, state, country, phone_main) VALUES
('TechCorp Solutions', '123 Tech Drive', 'Suite 200', 'Techville', 'CA', 'USA', '555-123-4567'),
('Aerospace Innovations', '456 Aerospace Blvd', 'Suite 300', 'Skycity', 'TX', 'USA', '555-234-5678'),
('SupplyPro Ltd.', '789 Supply St.', 'Building 4', 'Supplytown', 'FL', 'USA', '555-345-6789');

-- Insert into users (company_id links to the companies table)
INSERT INTO users (email, password, full_name, phone, is_admin, company_id) VALUES
('admin@techcorp.com', 'securepass123', 'Alice Johnson', '561-555-1234', TRUE, 1),
('buyer@aerospace.com', 'password321', 'Bob Smith', '727-555-5678', FALSE, 2),
('procurement@supplypro.com', 'mypassword', 'Charlie Davis', '727-555-9012', FALSE, 3),
('sales@techcorp.com', 'pass456', 'Derek White', '305-555-6789', FALSE, 1),
('ops@aerospace.com', 'aerosafe', 'Emily Green', '213-555-9876', FALSE, 2),
('manager@supplypro.com', 'supsecure', 'Frank Black', '305-555-4321', TRUE, 3);

-- Insert customers per company
INSERT INTO company_customers (company_id, customer_name, address_line1, address_line2, city, state, country, phone_main, markup_type, markup) VALUES
(1, 'SkyTech Manufacturing', '567 Sky Lane', 'Unit 1', 'Skycity', 'TX', 'USA', '555-567-1234', 'percentage', 12),
(1, 'ProBuild Corp.', '890 Industrial Park', 'Suite 20', 'Industryville', 'CA', 'USA', '555-678-3456', 'fixed', 750),
(2, 'Fasteners Inc.', '432 Fastener St.', 'Suite 5', 'Boltown', 'FL', 'USA', '555-789-5678', 'percentage', 8),
(2, 'MegaMachinery', '101 Heavy Rd.', 'Building 9', 'Machinetown', 'TX', 'USA', '555-654-3210', 'fixed', 600),
(3, 'Elite Components', '555 Elite Ave.', 'Unit 7', 'Partsville', 'NY', 'USA', '555-456-9870', 'percentage', 10);

-- Insert into rfqs (company_id, customer_name, user_id)
INSERT INTO rfqs (company_id, customer_name, user_id, rfq_number) VALUES
(1, 'SkyTech Manufacturing', 2, 'RFQ-001'),
(2, 'MegaMachinery', 5, 'RFQ-002'),
(3, 'Elite Components', 6, 'RFQ-003');

-- Insert into quotes (company_id, customer_name, user_id, valid_until, quote_number, notes)
INSERT INTO quotes (company_id, customer_name, user_id, valid_until, quote_number, notes) VALUES
(1, 'SkyTech Manufacturing', 2, '2025-03-01', 'QUOTE-001', 'This quote includes special pricing for bulk orders of steel bolts.'),
(2, 'MegaMachinery', 5, '2025-04-01', 'QUOTE-002', 'Hydraulic pumps and pressure valves for the new production line.'),
(3, 'Elite Components', 6, '2025-05-01', 'QUOTE-003', 'Aluminum sheets and O-ring seals for construction purposes.');

-- Insert into company_items (each company has its own item definitions)
INSERT INTO company_items (company_id, item_code, description, uom, cost) VALUES
(1, 'item001', 'Steel Bolts', 'box', 50),
(1, 'item005', 'Circuit Board', 'unit', 500),
(2, 'item002', 'Hydraulic Pump', 'unit', 2000),
(2, 'item006', 'Pressure Valve', 'unit', 300),
(3, 'item003', 'Aluminum Sheet', 'sheet', 100),
(3, 'item004', 'O-Ring Seals', 'pack', 20);

-- Insert into rfq_items (each rfq references items per company)
INSERT INTO rfq_items (rfq_id, company_id, item_code, quantity, item_description, item_cost) VALUES
(1, 1, 'item001', 10, 'Steel Bolts for production', 50),
(1, 1, 'item005', 5, 'Circuit Boards for assembly', 500),   
(2, 2, 'item002', 3, 'Hydraulic Pumps for machinery', 2000),   
(2, 2, 'item006', 2, 'Pressure Valves for systems', 300),  
(3, 3, 'item003', 7, 'Aluminum Sheets for construction', 100),   
(3, 3, 'item004', 20, 'O-Ring Seals for sealing', 20);

-- Insert into quote_items (each quote references items per company)
INSERT INTO quote_items (quote_id, company_id, item_code, quantity, item_description, item_price) VALUES
(1, 1, 'item001', 10, 'Steel Bolts for bulk order', 45),  
(1, 1, 'item005', 5, 'Circuit Boards for assembly', 480),   
(2, 2, 'item002', 3, 'Hydraulic Pumps for machinery', 1950),   
(2, 2, 'item006', 2, 'Pressure Valves for systems', 290),  
(3, 3, 'item003', 7, 'Aluminum Sheets for construction', 95),   
(3, 3, 'item004', 20, 'O-Ring Seals for sealing', 18);