-- Create companies table (with address details)
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(25),
  state VARCHAR(2),
  country TEXT DEFAULT 'USA',
  phone_main TEXT
);

-- Create users table (with a reference to companies)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  company_id INTEGER NOT NULL REFERENCES companies(id)
);

-- Create customers table (with address details)
CREATE TABLE company_customers (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(25),
  state VARCHAR(2),
  country TEXT DEFAULT 'USA',
  phone_main TEXT,
  markup_type TEXT NOT NULL,
  markup INTEGER NOT NULL CHECK (markup > 0),
  PRIMARY KEY (company_id, customer_name)  -- Customers are unique per company
);

-- Create items table (with 'code' as the primary key)
CREATE TABLE company_items (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_code VARCHAR(25) NOT NULL,
  description TEXT NOT NULL,
  uom TEXT NOT NULL,
  cost NUMERIC(10,2) CHECK (cost >= 0),
  PRIMARY KEY (company_id, item_code)  -- Unique per company
);

-- Create rfqs table (request for quote, referencing customers, users, and companies)
CREATE TABLE rfqs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  rfq_number VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (company_id, customer_name) REFERENCES company_customers(company_id, customer_name) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT unique_rfq_per_company UNIQUE (company_id, rfq_number)
);

CREATE TABLE quotes (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  valid_until TEXT NOT NULL,
  quote_number VARCHAR(50) NOT NULL,  
  notes TEXT,  
  FOREIGN KEY (company_id, customer_name) REFERENCES company_customers(company_id, customer_name) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (company_id, quote_number) 
);

-- Create rfq_items table (relationship table between rfqs and items)
CREATE TABLE rfq_items (
  id SERIAL PRIMARY KEY,
  rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL,  
  item_code VARCHAR(25) NOT NULL,
  quantity INTEGER CHECK (quantity > 0),
  item_description TEXT, 
  item_cost NUMERIC(10, 2) CHECK (item_cost >= 0),
  FOREIGN KEY (company_id, item_code) REFERENCES company_items(company_id, item_code) ON DELETE CASCADE
);

-- Create quote_items table (relationship table between quotes and items)
CREATE TABLE quote_items (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,  
  company_id INTEGER NOT NULL,  
  item_code VARCHAR(25) NOT NULL, 
  quantity INTEGER CHECK (quantity > 0), 
  item_description TEXT,  
  item_price NUMERIC(10, 2) CHECK (item_price >= 0), 
  FOREIGN KEY (company_id, item_code) REFERENCES company_items(company_id, item_code) ON DELETE CASCADE
);