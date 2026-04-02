PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  customer_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  customer_type TEXT DEFAULT 'Retail',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  reg_no TEXT NOT NULL UNIQUE,
  vin TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  transmission TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT,
  current_km INTEGER DEFAULT 0,
  chassis_no TEXT,
  engine_no TEXT,
  usage_type TEXT DEFAULT 'Personal',
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS service_history (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  service_date TEXT NOT NULL,
  service_type TEXT NOT NULL,
  complaint_summary TEXT NOT NULL,
  work_done TEXT NOT NULL,
  amount_paid REAL NOT NULL,
  service_number INTEGER NOT NULL,
  advisor_name TEXT NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

CREATE TABLE IF NOT EXISTS technicians (
  id TEXT PRIMARY KEY,
  emp_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  skill_level TEXT NOT NULL,
  availability_status TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  bay_type TEXT,
  bay_no TEXT,
  workload_score INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  part_code TEXT NOT NULL UNIQUE,
  part_name TEXT NOT NULL,
  category TEXT NOT NULL,
  stock_qty INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  source_location TEXT NOT NULL,
  reorder_level INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS service_catalog (
  id TEXT PRIMARY KEY,
  service_code TEXT NOT NULL UNIQUE,
  service_name TEXT NOT NULL,
  category TEXT NOT NULL,
  labor_cost REAL NOT NULL,
  estimated_time_mins INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS job_cards (
  id TEXT PRIMARY KEY,
  job_card_no TEXT NOT NULL UNIQUE,
  vehicle_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  advisor_name TEXT NOT NULL,
  opening_km INTEGER NOT NULL,
  complaint_text TEXT,
  ai_parsed_issues TEXT,
  advisor_observations TEXT,
  suggested_repairs TEXT,
  estimated_cost REAL DEFAULT 0,
  final_cost REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  addon_total REAL DEFAULT 0,
  gst_amount REAL DEFAULT 0,
  approval_status TEXT DEFAULT 'Pending',
  payment_status TEXT DEFAULT 'Unpaid',
  status TEXT DEFAULT 'Draft',
  service_type TEXT,
  complaint_source TEXT,
  repeat_complaint INTEGER DEFAULT 0,
  typed_acknowledgement TEXT,
  signature_data_url TEXT,
  bay_no TEXT,
  estimated_delivery_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS job_card_services (
  id TEXT PRIMARY KEY,
  job_card_id TEXT NOT NULL,
  service_catalog_id TEXT,
  service_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost REAL NOT NULL,
  total_cost REAL NOT NULL,
  source_type TEXT NOT NULL,
  FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (service_catalog_id) REFERENCES service_catalog(id)
);

CREATE TABLE IF NOT EXISTS job_card_parts (
  id TEXT PRIMARY KEY,
  job_card_id TEXT NOT NULL,
  inventory_id TEXT,
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  availability_status TEXT NOT NULL,
  source_location TEXT,
  FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_id) REFERENCES inventory(id)
);

CREATE TABLE IF NOT EXISTS job_card_technicians (
  id TEXT PRIMARY KEY,
  job_card_id TEXT NOT NULL,
  technician_id TEXT NOT NULL,
  assignment_type TEXT NOT NULL,
  assigned_task TEXT NOT NULL,
  task_status TEXT NOT NULL,
  checklist_json TEXT,
  FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (technician_id) REFERENCES technicians(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  job_card_id TEXT NOT NULL,
  payment_ref TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  paid_at TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (job_card_id) REFERENCES job_cards(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  job_card_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  triggered_at TEXT NOT NULL,
  scheduled_for TEXT,
  details TEXT,
  FOREIGN KEY (job_card_id) REFERENCES job_cards(id)
);

CREATE TABLE IF NOT EXISTS sales_leads (
  id TEXT PRIMARY KEY,
  lead_no TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  interested_model TEXT NOT NULL,
  interested_variant TEXT,
  showroom_location TEXT,
  enquiry_source TEXT,
  lead_status TEXT NOT NULL DEFAULT 'Enquired',
  current_stage TEXT NOT NULL DEFAULT 'Enquiry',
  next_intent TEXT,
  notes TEXT,
  follow_up_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_test_drives (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  notes TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES sales_leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_feedback (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE,
  rating_experience INTEGER NOT NULL,
  rating_comfort INTEGER NOT NULL,
  rating_advisor INTEGER NOT NULL,
  next_intent TEXT NOT NULL,
  follow_up_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES sales_leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_vehicle_catalog (
  id TEXT PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT NOT NULL,
  ex_showroom_price REAL NOT NULL,
  road_tax_rate REAL NOT NULL DEFAULT 0.10,
  insurance_rate REAL NOT NULL DEFAULT 0.035,
  addons_cost REAL NOT NULL DEFAULT 15000,
  handling_cost REAL NOT NULL DEFAULT 8000,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sales_vehicle_inventory (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  variant TEXT NOT NULL,
  color TEXT NOT NULL,
  units_available INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL,
  eta_label TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sales_estimates (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  variant TEXT NOT NULL,
  ex_showroom_price REAL NOT NULL,
  road_tax REAL NOT NULL,
  insurance REAL NOT NULL,
  addons REAL NOT NULL,
  handling REAL NOT NULL,
  on_road_total REAL NOT NULL,
  reviewed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES sales_leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_bookings (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE,
  booking_no TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  variant TEXT NOT NULL,
  color_preference TEXT,
  finance_type TEXT,
  booking_date TEXT NOT NULL,
  advance_amount REAL NOT NULL,
  payment_mode TEXT,
  payment_ref TEXT,
  payment_received INTEGER NOT NULL DEFAULT 0,
  expected_delivery_date TEXT,
  delivery_location TEXT,
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES sales_leads(id) ON DELETE CASCADE
);
