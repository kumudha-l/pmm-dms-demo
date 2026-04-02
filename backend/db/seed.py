import json
from datetime import datetime, timedelta
from uuid import uuid4

from .init import initialize_database
from .database import db_cursor


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:10]}"


def insert_many(conn, table: str, rows: list[dict]) -> None:
    if not rows:
        return
    keys = list(rows[0].keys())
    sql = f"INSERT INTO {table} ({', '.join(keys)}) VALUES ({', '.join(['?'] * len(keys))})"
    conn.executemany(sql, [tuple(row[key] for key in keys) for row in rows])


def reset(conn) -> None:
    for table in [
        "notifications",
        "payments",
        "job_card_technicians",
        "job_card_parts",
        "job_card_services",
        "job_cards",
        "sales_bookings",
        "sales_estimates",
        "sales_feedback",
        "sales_test_drives",
        "sales_vehicle_inventory",
        "sales_vehicle_catalog",
        "sales_leads",
        "service_history",
        "vehicles",
        "customers",
        "technicians",
        "inventory",
        "service_catalog",
    ]:
        conn.execute(f"DELETE FROM {table}")


def seed_data() -> None:
    initialize_database()
    with db_cursor() as conn:
        reset(conn)

        customers = [
            ("cust_001", "CUST-1001", "Rajan Pillai", "+91 98470 11001", "rajan.pillai@example.com", "Panampilly Nagar, Kochi", "Retail"),
            ("cust_002", "CUST-1002", "Anjali Nair", "+91 98470 11002", "anjali.nair@example.com", "Kakkanad, Kochi", "Retail"),
            ("cust_003", "CUST-1003", "Suresh Menon", "+91 98470 11003", "suresh.menon@example.com", "Thrippunithura, Kochi", "Corporate"),
            ("cust_004", "CUST-1004", "Meera Krishnan", "+91 98470 11004", "meera.krishnan@example.com", "Edappally, Kochi", "Retail"),
            ("cust_005", "CUST-1005", "Joseph Varghese", "+91 98470 11005", "joseph.varghese@example.com", "Aluva, Kochi", "Fleet"),
            ("cust_006", "CUST-1006", "Fathima Rahman", "+91 98470 11006", "fathima.rahman@example.com", "Fort Kochi, Kochi", "Retail"),
            ("cust_007", "CUST-1007", "Arun Babu", "+91 98470 11007", "arun.babu@example.com", "Kaloor, Kochi", "Retail"),
            ("cust_008", "CUST-1008", "Lakshmi Prasad", "+91 98470 11008", "lakshmi.prasad@example.com", "Tripunithura, Kochi", "Government"),
            ("cust_009", "CUST-1009", "Nikhil Thomas", "+91 98470 11009", "nikhil.thomas@example.com", "Kottayam", "Retail"),
            ("cust_010", "CUST-1010", "Devika Mohan", "+91 98470 11010", "devika.mohan@example.com", "Kadavanthra, Kochi", "Staff"),
            ("cust_011", "CUST-1011", "Basil George", "+91 98470 11011", "basil.george@example.com", "Thrissur", "Fleet"),
            ("cust_012", "CUST-1012", "Priya Radhakrishnan", "+91 98470 11012", "priya.radha@example.com", "Palarivattom, Kochi", "Retail"),
        ]
        insert_many(
            conn,
            "customers",
            [
                {
                    "id": cid,
                    "customer_code": code,
                    "name": name,
                    "phone": phone,
                    "email": email,
                    "address": address,
                    "customer_type": ctype,
                    "created_at": f"2024-01-{(idx + 10):02d}T09:00:00",
                }
                for idx, (cid, code, name, phone, email, address, ctype) in enumerate(customers)
            ],
        )

        vehicle_defs = [
            ("veh_001", "KL47F7878", "cust_001", "Maruti Suzuki", "Swift", "ZXi", "Petrol", "Manual", 2023, "Red", 15823),
            ("veh_002", "KL38F8616", "cust_002", "Tata", "Nexon", "XZ+ Diesel", "Diesel", "Manual", 2022, "Grey", 24112),
            ("veh_003", "WB06F5977", "cust_003", "Tata", "Altroz", "XM+", "Petrol", "Manual", 2021, "Grey", 30245),
            ("veh_004", "MH12DE1433", "cust_004", "Hyundai", "Creta", "SX IVT", "Petrol", "CVT", 2024, "White", 8234),
            ("veh_005", "KL22IJ5678", "cust_005", "Maruti Suzuki", "Baleno", "Alpha AMT", "Petrol", "AMT", 2022, "Blue", 18876),
            ("veh_006", "KL01KL6789", "cust_006", "Tata", "Tiago", "XZ CNG", "CNG", "Manual", 2023, "White", 12101),
            ("veh_007", "KL13MN7890", "cust_007", "Tata", "Punch", "Adventure", "Petrol", "Manual", 2024, "Green", 6950),
            ("veh_008", "KL24OP8901", "cust_008", "Hyundai", "i20", "Asta", "Petrol", "CVT", 2021, "Blue", 27654),
            ("veh_009", "KL05QR9012", "cust_009", "Maruti Suzuki", "Swift", "VXi", "Petrol", "Manual", 2020, "White", 40128),
            ("veh_010", "KL41ST0123", "cust_010", "Tata", "Nexon", "Fearless DCT", "Petrol", "DCT", 2024, "Red", 4320),
            ("veh_011", "KL14UV1235", "cust_011", "Tata", "Altroz", "XT Diesel", "Diesel", "Manual", 2022, "Blue", 35442),
            ("veh_012", "KL09WX2346", "cust_012", "Hyundai", "Creta", "SX(O) Diesel AT", "Diesel", "Automatic", 2023, "Grey", 16780),
        ]
        insert_many(
            conn,
            "vehicles",
            [
                {
                    "id": vid,
                    "reg_no": reg,
                    "vin": f"VIN{idx + 10000}",
                    "customer_id": cust,
                    "make": make,
                    "model": model,
                    "variant": variant,
                    "fuel_type": fuel,
                    "transmission": trans,
                    "year": year,
                    "color": color,
                    "current_km": km,
                    "chassis_no": f"CH{idx + 10000}",
                    "engine_no": f"EN{idx + 10000}",
                    "usage_type": "Personal" if idx not in {4, 10} else "Fleet",
                }
                for idx, (vid, reg, cust, make, model, variant, fuel, trans, year, color, km) in enumerate(vehicle_defs)
            ],
        )

        technician_defs = [
            ("tech_001", "PMM-T001", "Suresh Nair", "General Service", "Senior", "Available", "General Service Bay", "Bay 3", 2),
            ("tech_002", "PMM-T002", "Akhil Jose", "Brake Specialist", "Senior", "Available", "General Service Bay", "Bay 4", 3),
            ("tech_003", "PMM-T003", "Rahul Biju", "Wheel Alignment Technician", "Intermediate", "Available", "Wheel Alignment Bay", "Bay 6", 1),
            ("tech_004", "PMM-T004", "Shafeeq Ali", "AC Technician", "Senior", "Busy", "Diagnostic Bay", "Bay 8", 5),
            ("tech_005", "PMM-T005", "Nithin Paul", "Electrical Technician", "Senior", "Available", "Diagnostic Bay", "Bay 7", 2),
            ("tech_006", "PMM-T006", "Vishnu Das", "Diagnostic Technician", "Senior", "Available", "Diagnostic Bay", "Bay 5", 2),
            ("tech_007", "PMM-T007", "Jomon Varghese", "General Service", "Intermediate", "Leave", "Express Bay", "Bay 2", 0),
        ]
        insert_many(
            conn,
            "technicians",
            [
                {
                    "id": tid,
                    "emp_code": code,
                    "name": name,
                    "specialization": spec,
                    "skill_level": skill,
                    "availability_status": avail,
                    "active": 1,
                    "bay_type": bay_type,
                    "bay_no": bay_no,
                    "workload_score": workload,
                }
                for tid, code, name, spec, skill, avail, bay_type, bay_no, workload in technician_defs
            ],
        )

        inventory_rows = []
        inv_defs = [
            ("Engine Oil 5W30", "Lubricants", 32, 760, "Main Store", 10), ("Oil Filter", "Filters", 18, 340, "Fast Moving Counter", 6),
            ("Air Filter", "Filters", 7, 580, "Main Store", 6), ("Cabin Filter", "Filters", 4, 720, "External Vendor", 5),
            ("Front Brake Pad Set", "Brake", 5, 2850, "Main Store", 4), ("Rear Brake Shoe Set", "Brake", 2, 1980, "Regional Warehouse", 3),
            ("Brake Fluid DOT4", "Brake", 12, 420, "Fast Moving Counter", 4), ("AC Refrigerant Gas", "AC", 8, 950, "Main Store", 3),
            ("AC Filter", "AC", 3, 880, "External Vendor", 4), ("45AH Battery", "Electrical", 6, 5400, "Main Store", 2),
            ("Spark Plug Set", "Engine", 9, 1400, "Fast Moving Counter", 4), ("Wiper Blade Pair", "Accessories", 14, 670, "Main Store", 5),
            ("Coolant 1L", "Fluids", 16, 390, "Fast Moving Counter", 5), ("Clutch Kit", "Transmission", 1, 6200, "Regional Warehouse", 2),
            ("Wheel Balancing Weight Kit", "Tyre", 20, 150, "Wheel Alignment Bay", 8), ("Tie Rod End", "Steering", 3, 1240, "Main Store", 3),
            ("Front Shock Absorber", "Suspension", 2, 4200, "Regional Warehouse", 2), ("Fuse Box Assembly", "Electrical", 1, 3150, "External Vendor", 2),
            ("Headlamp Unit", "Body / Exterior", 2, 7800, "Body Shop Store", 1), ("Bumper Clip Kit", "Body / Exterior", 11, 220, "Body Shop Store", 5),
            ("Polishing Compound", "Detailing", 8, 540, "Body Shop Store", 3), ("Foam Wash Shampoo", "Detailing", 10, 320, "Washing Bay", 4),
            ("Underbody Coating Can", "Detailing", 6, 1450, "External Vendor", 2), ("Fuel Pump Assembly", "Engine", 0, 8650, "To Be Procured", 1),
            ("Wheel Bearing Kit", "Suspension", 2, 1950, "Alternate Godown", 2),
        ]
        for idx, (name, category, stock, price, source, reorder) in enumerate(inv_defs, start=1):
            inventory_rows.append(
                {
                    "id": f"inv_{idx:03d}",
                    "part_code": f"PRT-{idx:03d}",
                    "part_name": name,
                    "category": category,
                    "stock_qty": stock,
                    "unit_price": price,
                    "source_location": source,
                    "reorder_level": reorder,
                }
            )
        insert_many(conn, "inventory", inventory_rows)

        service_defs = [
            ("svc_001", "LAB-FREE-1", "1st Free Service", "Free Service", 0, 80),
            ("svc_002", "LAB-FREE-2", "2nd Free Service", "Free Service", 0, 90),
            ("svc_003", "LAB-FREE-3", "3rd Free Service", "Free Service", 0, 100),
            ("svc_004", "LAB-PAID-PERIODIC", "Periodic Service", "Periodic Service", 1850, 120),
            ("svc_005", "LAB-BRAKE-INSPECT", "Brake Inspection & Cleaning", "Brake", 950, 45),
            ("svc_006", "LAB-BRAKE-PAD", "Brake Pad Replacement", "Brake", 1250, 60),
            ("svc_007", "LAB-ALIGNMENT", "Wheel Alignment", "Wheel Alignment", 780, 35),
            ("svc_008", "LAB-BALANCING", "Wheel Balancing", "Wheel Balancing", 650, 30),
            ("svc_009", "LAB-AC-DIAG", "AC Diagnosis", "AC / HVAC", 1100, 50),
            ("svc_010", "LAB-AC-SERVICE", "AC Service & Gas Refill", "AC / HVAC", 1680, 75),
            ("svc_011", "LAB-ELEC-DIAG", "Electrical Diagnosis", "Electrical", 1350, 70),
            ("svc_012", "LAB-BODY-REPAIR", "Minor Body Repair", "Body Shop", 2800, 150),
            ("svc_013", "LAB-POLISH", "Exterior Polishing", "Add-on", 1200, 60),
            ("svc_014", "LAB-INT-CLEAN", "Interior Cleaning", "Add-on", 850, 40),
            ("svc_015", "LAB-DIAG-SCAN", "Diagnostic Scan", "Diagnostics", 980, 25),
        ]
        insert_many(
            conn,
            "service_catalog",
            [
                {"id": sid, "service_code": code, "service_name": name, "category": cat, "labor_cost": cost, "estimated_time_mins": mins}
                for sid, code, name, cat, cost, mins in service_defs
            ],
        )

        history_rows = []
        history_templates = [
            ("1st Service", "Routine first service", "First service completed", 1800),
            ("2nd Service", "Brake noise and periodic check", "Brake cleaning and periodic checks", 2850),
            ("3rd Service", "Mileage drop and general service", "Third service plus diagnostics", 3620),
            ("Running Repair", "AC cooling issue", "AC diagnosis and filter replacement", 3960),
            ("General Check-up", "Repeat brake complaint", "Brake inspection and wheel bearing check", 2120),
        ]
        for idx, vehicle in enumerate(vehicle_defs):
            vid = vehicle[0]
            for repeat in range(2 if idx < 6 else 3):
                template = history_templates[(idx + repeat) % len(history_templates)]
                history_rows.append(
                    {
                        "id": make_id("hist"),
                        "vehicle_id": vid,
                        "service_date": (datetime(2024, 1, 15) + timedelta(days=(idx * 28) + (repeat * 120))).date().isoformat(),
                        "service_type": template[0],
                        "complaint_summary": template[1] if not (vid in {"veh_001", "veh_009"} and repeat == 1) else "Repeat front brake noise",
                        "work_done": template[2],
                        "amount_paid": float(template[3] + (repeat * 420)),
                        "service_number": repeat + 1,
                        "advisor_name": "Arjun M." if repeat % 2 == 0 else "Neethu R.",
                    }
                )
        history_rows = history_rows[:30]
        insert_many(conn, "service_history", history_rows)

        job_cards = [
            ("jc_001", "JC-2026-0001", "veh_001", "cust_001", "Arjun M.", 15823, "Brake noise from front, also need free service", [{"issue": "Front brake noise", "category": "Brake", "priority": "Medium"}], "Front brake pad wear visible.", "Brake pad inspection, brake cleaning, second service items", 5782, 5782, 250, 650, 882, "Approved by Customer", "Unpaid", "Billing In Progress", "2nd Free Service", "Walk-in", 1, "Approved by Rajan Pillai", "", "Bay 3"),
            ("jc_002", "JC-2026-0002", "veh_002", "cust_002", "Neethu R.", 24112, "Steering pulling left and uneven tyre wear", [{"issue": "Wheel alignment required", "category": "Wheel Alignment", "priority": "Medium"}], "Inner tyre wear noted.", "Wheel alignment and balancing", 3120, 0, 0, 0, 476, "Pending", "Unpaid", "Awaiting Approval", "Running Repair", "Online Booking", 0, "", "", ""),
            ("jc_003", "JC-2026-0003", "veh_003", "cust_003", "Arjun M.", 30245, "AC cooling low and battery warning once", [{"issue": "AC performance issue", "category": "AC / HVAC", "priority": "High"}, {"issue": "Electrical warning", "category": "Electrical", "priority": "Medium"}], "Blower noise audible.", "AC diagnosis and electrical diagnosis", 8460, 0, 300, 0, 1290, "Approved by Customer", "Unpaid", "Assigned", "Running Repair", "Phone Booking", 0, "Approved by Suresh Menon", "", "Bay 8"),
            ("jc_004", "JC-2026-0004", "veh_004", "cust_004", "Neethu R.", 8234, "Routine 2nd free service and car wash", [{"issue": "Scheduled service due", "category": "Service", "priority": "Low"}], "No abnormality noted.", "2nd free service items", 2480, 2480, 0, 850, 378, "Approved by Customer", "Paid", "Closed", "2nd Free Service", "Online Booking", 0, "Approved by Meera Krishnan", "", "Bay 2"),
            ("jc_005", "JC-2026-0005", "veh_005", "cust_005", "Arjun M.", 18876, "Brake issue plus alignment required", [{"issue": "Brake pad wear", "category": "Brake", "priority": "High"}], "Front pad wear and steering vibration.", "Brake pad replacement and wheel alignment", 9120, 9430, 450, 650, 1439, "Re-approval Required", "Unpaid", "In Progress", "Running Repair", "Walk-in", 1, "Initial approval from Joseph Varghese", "", "Bay 4"),
            ("jc_006", "JC-2026-0006", "veh_006", "cust_006", "Neethu R.", 12101, "3rd service and check mileage drop", [{"issue": "Periodic service due", "category": "Service", "priority": "Low"}], "Spark plug condition to be checked.", "Third service, scan and fuel system cleaning", 3920, 0, 0, 0, 598, "Pending", "Unpaid", "Estimate Prepared", "3rd Free Service", "Online Booking", 0, "", "", ""),
            ("jc_007", "JC-2026-0007", "veh_007", "cust_007", "Arjun M.", 6950, "1st free service, pickup and drop requested", [{"issue": "Scheduled service due", "category": "Service", "priority": "Low"}], "Vehicle clean, no issues observed.", "1st service", 2350, 0, 0, 550, 359, "Approved by Customer", "Unpaid", "Assigned", "1st Free Service", "Phone Booking", 0, "Approved by Arun Babu", "", "Bay 1"),
            ("jc_008", "JC-2026-0008", "veh_008", "cust_008", "Neethu R.", 27654, "AC not cooling and warning light came once", [{"issue": "AC not cooling", "category": "AC / HVAC", "priority": "High"}], "Compressor engagement delayed.", "AC diagnosis, diagnostic scan", 6640, 6640, 200, 0, 1013, "Approved by Customer", "Paid", "Paid", "Running Repair", "RSA / Breakdown", 1, "Approved by Lakshmi Prasad", "", "Bay 7"),
            ("jc_009", "JC-2026-0009", "veh_009", "cust_009", "Arjun M.", 40128, "Repeat brake noise and wheel humming sound", [{"issue": "Repeat brake complaint", "category": "Brake", "priority": "High"}], "Likely wheel bearing issue.", "Brake inspection and wheel bearing replacement", 7820, 0, 150, 0, 1193, "Pending", "Unpaid", "Draft", "General Check-up", "Repeat Visit", 1, "", "", ""),
            ("jc_010", "JC-2026-0010", "veh_012", "cust_012", "Neethu R.", 16780, "Body scratch repair and polish", [{"issue": "Body scratch repair", "category": "Body / Exterior", "priority": "Medium"}], "Rear bumper and right fender scratches visible.", "Minor body repair and exterior polish", 9680, 9680, 500, 1200, 1477, "Approved by Customer", "Paid", "Closed", "Body Shop", "Walk-in", 0, "Approved by Priya Radhakrishnan", "", "Bay 9"),
        ]
        base_created = datetime(2026, 3, 27, 8, 0, 0)
        insert_many(
            conn,
            "job_cards",
            [
                {
                    "id": jid,
                    "job_card_no": jcno,
                    "vehicle_id": veh,
                    "customer_id": cust,
                    "advisor_name": advisor,
                    "opening_km": km,
                    "complaint_text": complaint,
                    "ai_parsed_issues": json.dumps(issues),
                    "advisor_observations": observations,
                    "suggested_repairs": repairs,
                    "estimated_cost": est,
                    "final_cost": final,
                    "discount_amount": discount,
                    "addon_total": addon,
                    "gst_amount": gst,
                    "approval_status": approval,
                    "payment_status": payment,
                    "status": status,
                    "service_type": service_type,
                    "complaint_source": source,
                    "repeat_complaint": repeat,
                    "typed_acknowledgement": ack,
                    "signature_data_url": sig,
                    "bay_no": bay,
                    "estimated_delivery_at": (base_created + timedelta(hours=idx + 6)).isoformat(),
                    "created_at": (base_created - timedelta(hours=idx)).isoformat(),
                    "updated_at": (base_created + timedelta(minutes=idx * 20)).isoformat(),
                }
                for idx, (jid, jcno, veh, cust, advisor, km, complaint, issues, observations, repairs, est, final, discount, addon, gst, approval, payment, status, service_type, source, repeat, ack, sig, bay) in enumerate(job_cards)
            ],
        )

        svc_map = {
            "jc_001": [("svc_002", "2nd Free Service", 1, 0, "Suggested Services"), ("svc_005", "Brake Inspection & Cleaning", 1, 950, "Suggested Services"), ("svc_008", "Wheel Balancing", 1, 650, "ADD SERVICES")],
            "jc_003": [("svc_009", "AC Diagnosis", 1, 1100, "Suggested Services"), ("svc_011", "Electrical Diagnosis", 1, 1350, "Suggested Services")],
            "jc_005": [("svc_006", "Brake Pad Replacement", 1, 1250, "Suggested Services"), ("svc_007", "Wheel Alignment", 1, 780, "Suggested Services"), ("svc_008", "Wheel Balancing", 1, 650, "ADD SERVICES")],
            "jc_010": [("svc_012", "Minor Body Repair", 1, 2800, "Suggested Services"), ("svc_013", "Exterior Polishing", 1, 1200, "ADD SERVICES")],
        }
        service_rows = []
        for job_id, services in svc_map.items():
            for service_catalog_id, name, qty, unit_cost, source_type in services:
                service_rows.append({"id": make_id("jcs"), "job_card_id": job_id, "service_catalog_id": service_catalog_id, "service_name": name, "quantity": qty, "unit_cost": unit_cost, "total_cost": qty * unit_cost, "source_type": source_type})
        insert_many(conn, "job_card_services", service_rows)

        part_rows = [
            {"id": make_id("jcp"), "job_card_id": "jc_001", "inventory_id": "inv_001", "part_name": "Engine Oil 5W30", "quantity": 3, "unit_price": 760, "total_price": 2280, "availability_status": "In Stock", "source_location": "Main Store"},
            {"id": make_id("jcp"), "job_card_id": "jc_001", "inventory_id": "inv_002", "part_name": "Oil Filter", "quantity": 1, "unit_price": 340, "total_price": 340, "availability_status": "In Stock", "source_location": "Fast Moving Counter"},
            {"id": make_id("jcp"), "job_card_id": "jc_003", "inventory_id": "inv_008", "part_name": "AC Refrigerant Gas", "quantity": 1, "unit_price": 950, "total_price": 950, "availability_status": "In Stock", "source_location": "Main Store"},
            {"id": make_id("jcp"), "job_card_id": "jc_003", "inventory_id": "inv_009", "part_name": "AC Filter", "quantity": 1, "unit_price": 880, "total_price": 880, "availability_status": "Low Stock", "source_location": "External Vendor"},
            {"id": make_id("jcp"), "job_card_id": "jc_005", "inventory_id": "inv_005", "part_name": "Front Brake Pad Set", "quantity": 1, "unit_price": 2850, "total_price": 2850, "availability_status": "In Stock", "source_location": "Main Store"},
            {"id": make_id("jcp"), "job_card_id": "jc_005", "inventory_id": "inv_025", "part_name": "Wheel Bearing Kit", "quantity": 1, "unit_price": 1950, "total_price": 1950, "availability_status": "Available at Alternate Godown", "source_location": "Alternate Godown"},
            {"id": make_id("jcp"), "job_card_id": "jc_010", "inventory_id": "inv_021", "part_name": "Polishing Compound", "quantity": 2, "unit_price": 540, "total_price": 1080, "availability_status": "In Stock", "source_location": "Body Shop Store"},
        ]
        insert_many(conn, "job_card_parts", part_rows)

        technician_rows = [
            {"id": make_id("jct"), "job_card_id": "jc_001", "technician_id": "tech_001", "assignment_type": "General", "assigned_task": "2nd free service and brake check", "task_status": "Completed", "checklist_json": json.dumps([{"label": "Oil changed", "done": True}, {"label": "Brake cleaned", "done": True}])},
            {"id": make_id("jct"), "job_card_id": "jc_003", "technician_id": "tech_001", "assignment_type": "General", "assigned_task": "General inspection", "task_status": "In Progress", "checklist_json": json.dumps([{"label": "Inspection started", "done": True}, {"label": "Road test", "done": False}])},
            {"id": make_id("jct"), "job_card_id": "jc_003", "technician_id": "tech_005", "assignment_type": "Specialist", "assigned_task": "Electrical diagnosis", "task_status": "Pending", "checklist_json": json.dumps([{"label": "Scan DTCs", "done": False}])},
            {"id": make_id("jct"), "job_card_id": "jc_005", "technician_id": "tech_001", "assignment_type": "General", "assigned_task": "Brake pad replacement", "task_status": "In Progress", "checklist_json": json.dumps([{"label": "Vehicle lifted", "done": True}, {"label": "Pads removed", "done": True}, {"label": "Test drive", "done": False}])},
            {"id": make_id("jct"), "job_card_id": "jc_005", "technician_id": "tech_002", "assignment_type": "Specialist", "assigned_task": "Brake system inspection", "task_status": "In Progress", "checklist_json": json.dumps([{"label": "Pad wear verified", "done": True}, {"label": "Disc runout checked", "done": False}])},
            {"id": make_id("jct"), "job_card_id": "jc_005", "technician_id": "tech_003", "assignment_type": "Specialist", "assigned_task": "Wheel alignment", "task_status": "Pending", "checklist_json": json.dumps([{"label": "Alignment readings", "done": False}])},
            {"id": make_id("jct"), "job_card_id": "jc_007", "technician_id": "tech_001", "assignment_type": "General", "assigned_task": "1st service", "task_status": "Pending", "checklist_json": json.dumps([{"label": "PDI check", "done": False}, {"label": "Wash", "done": False}])},
        ]
        insert_many(conn, "job_card_technicians", technician_rows)

        payment_rows = [
            {"id": make_id("pay"), "job_card_id": "jc_004", "payment_ref": "UPI-240326-1021", "amount": 2480, "payment_method": "UPI", "payment_status": "Paid", "paid_at": "2026-03-26T16:05:00", "notes": "Counter payment"},
            {"id": make_id("pay"), "job_card_id": "jc_008", "payment_ref": "CC-240327-5512", "amount": 6640, "payment_method": "Credit Card", "payment_status": "Paid", "paid_at": "2026-03-27T14:55:00", "notes": "Swiped at cashier"},
            {"id": make_id("pay"), "job_card_id": "jc_010", "payment_ref": "NB-240325-8721", "amount": 9680, "payment_method": "Net Banking", "payment_status": "Paid", "paid_at": "2026-03-25T17:45:00", "notes": "Customer transferred online"},
            {"id": make_id("pay"), "job_card_id": "jc_008", "payment_ref": "EXTRA-2025-09", "amount": 480, "payment_method": "Cash", "payment_status": "Paid", "paid_at": "2025-09-15T12:00:00", "notes": "Previous extra charge example"},
        ]
        insert_many(conn, "payments", payment_rows)

        notification_rows = [
            {"id": make_id("not"), "job_card_id": "jc_004", "notification_type": "Invoice Sent", "recipient": "meera.krishnan@example.com", "status": "Logged", "triggered_at": "2026-03-26T16:10:00", "scheduled_for": None, "details": "Invoice simulated after payment"},
            {"id": make_id("not"), "job_card_id": "jc_004", "notification_type": "Next Service Reminder", "recipient": "+91 98470 11004", "status": "Scheduled", "triggered_at": "2026-03-26T16:10:00", "scheduled_for": "2026-09-26T09:00:00", "details": "6 month reminder"},
            {"id": make_id("not"), "job_card_id": "jc_004", "notification_type": "Feedback Reminder", "recipient": "+91 98470 11004", "status": "Scheduled", "triggered_at": "2026-03-26T16:10:00", "scheduled_for": "2026-03-28T10:00:00", "details": "2 day feedback reminder"},
            {"id": make_id("not"), "job_card_id": "jc_008", "notification_type": "Invoice Sent", "recipient": "lakshmi.prasad@example.com", "status": "Logged", "triggered_at": "2026-03-27T15:00:00", "scheduled_for": None, "details": "Invoice simulated after payment"},
            {"id": make_id("not"), "job_card_id": "jc_010", "notification_type": "Feedback Reminder", "recipient": "+91 98470 11012", "status": "Scheduled", "triggered_at": "2026-03-25T17:50:00", "scheduled_for": "2026-03-27T17:50:00", "details": "Body shop feedback request"},
        ]
        insert_many(conn, "notifications", notification_rows)

        sales_catalog_rows = []
        sales_catalog_defs = {
            "Tata Nexon": [
                ("XE · Manual · Petrol", 800000),
                ("XM · Manual · Petrol", 870000),
                ("XZ+ · AMT · Diesel", 1080000),
                ("Dark Edition · AMT · Diesel", 1190000),
                ("EV Max", 1450000),
            ],
            "Tata Harrier": [
                ("XE", 1520000),
                ("XM", 1660000),
                ("XT+", 1820000),
                ("XMA", 1940000),
                ("XZ+", 2140000),
            ],
            "Tata Punch": [
                ("Pure · Manual · Petrol", 620000),
                ("Adventure · AMT · Petrol", 780000),
                ("Accomplished · AMT · Petrol", 890000),
                ("Creative · AMT · Petrol", 1020000),
                ("EV", 1080000),
            ],
            "Tata Altroz": [
                ("XE · Manual · Petrol", 660000),
                ("XM · Manual · Petrol", 720000),
                ("XT · Manual · Petrol", 790000),
                ("XZ · Manual · Petrol", 860000),
                ("XZ+ · DCT · Petrol", 980000),
                ("Dark · DCT", 1050000),
            ],
            "Tata Safari": [
                ("XE · Manual", 1600000),
                ("XM · Manual", 1750000),
                ("XT+ · AMT", 2100000),
                ("XZ+ · AMT", 2350000),
                ("XZA+ · AWD", 2650000),
            ],
            "Tata Tiago": [
                ("XE · Manual · Petrol", 500000),
                ("XM · Manual · Petrol", 570000),
                ("XT · Manual · Petrol", 620000),
                ("XZ+ · AMT · Petrol", 700000),
                ("NRG · AMT", 740000),
            ],
            "Tata Tigor": [
                ("XE · Manual · Petrol", 600000),
                ("XM · Manual · Petrol", 670000),
                ("XT · Manual · Petrol", 730000),
                ("XZ+ · AMT · Petrol", 810000),
            ],
        }
        catalog_index = 1
        for model, variants in sales_catalog_defs.items():
            for variant, price in variants:
                sales_catalog_rows.append(
                    {
                        "id": f"scat_{catalog_index:03d}",
                        "make": "Tata",
                        "model": model,
                        "variant": variant,
                        "ex_showroom_price": price,
                        "road_tax_rate": 0.10,
                        "insurance_rate": 0.035,
                        "addons_cost": 15000,
                        "handling_cost": 8000,
                        "active": 1,
                    }
                )
                catalog_index += 1
        insert_many(conn, "sales_vehicle_catalog", sales_catalog_rows)

        sales_inventory_rows = []
        sales_inventory_defs = {
            "Tata Nexon": [
                ("Pristine White", "XM · Manual · Petrol", 3, "Kochi Main Yard", "Immediate"),
                ("Daytona Grey", "XZ+ · AMT · Diesel", 1, "Kochi Main Yard", "Immediate"),
                ("Flame Red", "XZ+ · AMT · Diesel", 0, "Ernakulam Transit", "~12 days"),
                ("Midnight Black", "Dark Edition · AMT · Diesel", 2, "Thrissur Depot", "3-5 days"),
                ("Deep Forest Green", "EV Max", 1, "Kochi Main Yard", "Immediate"),
            ],
            "Tata Harrier": [
                ("Pristine White", "XT+", 2, "Kochi Main Yard", "Immediate"),
                ("Oberon Black", "XMA", 1, "Kochi Main Yard", "Immediate"),
                ("Calypso Red", "XZ+", 0, "Factory Allocation", "~21 days"),
                ("Stellar Frost", "XZ+", 1, "Ernakulam Transit", "~7 days"),
            ],
            "Tata Punch": [
                ("Pristine White", "Adventure · AMT · Petrol", 4, "Kochi Main Yard", "Immediate"),
                ("Tornado Blue", "Accomplished · AMT · Petrol", 2, "Kochi Main Yard", "Immediate"),
                ("Dune Dust", "Creative · AMT · Petrol", 0, "Factory Allocation", "~18 days"),
                ("Flame Red", "EV", 1, "Kochi Main Yard", "Immediate"),
            ],
            "Tata Altroz": [
                ("Avenue White", "XM · Manual · Petrol", 3, "Kochi Main Yard", "Immediate"),
                ("Harbour Blue", "XZ+ · DCT · Petrol", 1, "Kochi Main Yard", "Immediate"),
                ("Downtown Red", "Dark · DCT", 0, "Factory Allocation", "~14 days"),
            ],
            "Tata Safari": [
                ("Stellar Frost", "XT+ · AMT", 1, "Kochi Main Yard", "Immediate"),
                ("Tropical Mist", "XZ+ · AMT", 0, "Ernakulam Transit", "~10 days"),
                ("Oberon Black", "XZA+ · AWD", 1, "Kochi Main Yard", "Immediate"),
            ],
            "Tata Tiago": [
                ("Teal By Tata", "XM · Manual · Petrol", 5, "Kochi Main Yard", "Immediate"),
                ("Arizona Blue", "XZ+ · AMT · Petrol", 2, "Kochi Main Yard", "Immediate"),
                ("Flame Red", "NRG · AMT", 1, "Thrissur Depot", "2-3 days"),
            ],
            "Tata Tigor": [
                ("Magnetic Red", "XT · Manual · Petrol", 2, "Kochi Main Yard", "Immediate"),
                ("Pearlescent White", "XZ+ · AMT · Petrol", 1, "Kochi Main Yard", "Immediate"),
            ],
        }
        inventory_index = 1
        for model, rows in sales_inventory_defs.items():
            for color, variant, units, location, eta_label in rows:
                sales_inventory_rows.append(
                    {
                        "id": f"sinv_{inventory_index:03d}",
                        "model": model,
                        "variant": variant,
                        "color": color,
                        "units_available": units,
                        "location": location,
                        "eta_label": eta_label,
                        "active": 1,
                    }
                )
                inventory_index += 1
        insert_many(conn, "sales_vehicle_inventory", sales_inventory_rows)

        sales_lead_rows = [
            {
                "id": "lead_001",
                "lead_no": "LEAD-2026-0001",
                "customer_name": "Anjali Nair",
                "phone": "+91 98765 43210",
                "email": "anjali.sales@example.com",
                "interested_model": "Tata Nexon",
                "interested_variant": "XZ+ · AMT · Diesel",
                "showroom_location": "Kochi Showroom",
                "enquiry_source": "Walk-in",
                "lead_status": "Soft Booked",
                "current_stage": "Soft Booking",
                "next_intent": "Wants to Book",
                "notes": "Customer wants quick delivery in white.",
                "follow_up_date": None,
                "created_at": "2026-04-01T09:00:00",
                "updated_at": "2026-04-01T11:40:00",
            },
            {
                "id": "lead_002",
                "lead_no": "LEAD-2026-0002",
                "customer_name": "Rohit Menon",
                "phone": "+91 91234 56789",
                "email": "rohit.menon@example.com",
                "interested_model": "Tata Harrier",
                "interested_variant": "XMA",
                "showroom_location": "Kochi Showroom",
                "enquiry_source": "Website",
                "lead_status": "Needs Time to Decide",
                "current_stage": "Feedback",
                "next_intent": "Needs Time to Decide",
                "notes": "Discussing finance options with family.",
                "follow_up_date": "2026-04-05",
                "created_at": "2026-03-31T10:15:00",
                "updated_at": "2026-04-01T10:05:00",
            },
            {
                "id": "lead_003",
                "lead_no": "LEAD-2026-0003",
                "customer_name": "Priya Suresh",
                "phone": "+91 94567 89012",
                "email": "priya.suresh@example.com",
                "interested_model": "Tata Punch",
                "interested_variant": "Adventure · AMT · Petrol",
                "showroom_location": "Kochi Showroom",
                "enquiry_source": "Walk-in",
                "lead_status": "Test Drive Scheduled",
                "current_stage": "Test Drive",
                "next_intent": None,
                "notes": "Coming with spouse for weekend drive.",
                "follow_up_date": None,
                "created_at": "2026-04-01T08:40:00",
                "updated_at": "2026-04-01T09:45:00",
            },
            {
                "id": "lead_004",
                "lead_no": "LEAD-2026-0004",
                "customer_name": "Arun Kumar",
                "phone": "+91 99887 76655",
                "email": "arun.kumar@example.com",
                "interested_model": "Tata Altroz",
                "interested_variant": "XM · Manual · Petrol",
                "showroom_location": "Kochi Showroom",
                "enquiry_source": "Walk-in",
                "lead_status": "Enquired",
                "current_stage": "Enquiry",
                "next_intent": None,
                "notes": "First visit, wants petrol hatchback.",
                "follow_up_date": None,
                "created_at": "2026-03-30T16:20:00",
                "updated_at": "2026-03-30T16:20:00",
            },
            {
                "id": "lead_005",
                "lead_no": "LEAD-2026-0005",
                "customer_name": "Deepa Thomas",
                "phone": "+91 90011 22334",
                "email": "deepa.thomas@example.com",
                "interested_model": "Tata Safari",
                "interested_variant": "XZ+ · AMT",
                "showroom_location": "Thrissur Branch",
                "enquiry_source": "Referral",
                "lead_status": "Not Proceeding",
                "current_stage": "Closed",
                "next_intent": "Not Proceeding",
                "notes": "Postponed purchase to next year.",
                "follow_up_date": None,
                "created_at": "2026-03-28T12:10:00",
                "updated_at": "2026-03-28T15:30:00",
            },
            {
                "id": "lead_006",
                "lead_no": "LEAD-2026-0006",
                "customer_name": "Vishnu Pillai",
                "phone": "+91 80123 45678",
                "email": "vishnu.pillai@example.com",
                "interested_model": "Tata Nexon",
                "interested_variant": "EV Max",
                "showroom_location": "Kochi Showroom",
                "enquiry_source": "Phone Call",
                "lead_status": "Will Visit Again",
                "current_stage": "Feedback",
                "next_intent": "Will Visit Again",
                "notes": "Needs another demo after office hours.",
                "follow_up_date": "2026-04-04",
                "created_at": "2026-04-01T10:45:00",
                "updated_at": "2026-04-01T11:10:00",
            },
        ]
        insert_many(conn, "sales_leads", sales_lead_rows)

        sales_test_drive_rows = [
            {
                "id": "td_001",
                "lead_id": "lead_001",
                "model": "Tata Nexon",
                "scheduled_date": "2026-04-01",
                "scheduled_time": "10:00",
                "status": "Done",
                "notes": "Customer liked the drive quality.",
                "completed_at": "2026-04-01T10:35:00",
                "created_at": "2026-04-01T09:05:00",
                "updated_at": "2026-04-01T10:35:00",
            },
            {
                "id": "td_002",
                "lead_id": "lead_002",
                "model": "Tata Harrier",
                "scheduled_date": "2026-03-31",
                "scheduled_time": "15:30",
                "status": "Done",
                "notes": "Asked about mileage and EMI.",
                "completed_at": "2026-03-31T16:10:00",
                "created_at": "2026-03-31T12:00:00",
                "updated_at": "2026-03-31T16:10:00",
            },
            {
                "id": "td_003",
                "lead_id": "lead_003",
                "model": "Tata Punch",
                "scheduled_date": "2026-04-02",
                "scheduled_time": "11:00",
                "status": "Scheduled",
                "notes": "Weekend slot confirmed.",
                "completed_at": None,
                "created_at": "2026-04-01T09:45:00",
                "updated_at": "2026-04-01T09:45:00",
            },
            {
                "id": "td_004",
                "lead_id": "lead_006",
                "model": "Tata Nexon",
                "scheduled_date": "2026-04-01",
                "scheduled_time": "17:00",
                "status": "Done",
                "notes": "EV explanation required more time.",
                "completed_at": "2026-04-01T17:40:00",
                "created_at": "2026-04-01T15:30:00",
                "updated_at": "2026-04-01T17:40:00",
            },
        ]
        insert_many(conn, "sales_test_drives", sales_test_drive_rows)

        sales_feedback_rows = [
            {
                "id": "sfb_001",
                "lead_id": "lead_001",
                "rating_experience": 5,
                "rating_comfort": 5,
                "rating_advisor": 5,
                "next_intent": "Wants to Book",
                "follow_up_date": None,
                "notes": "Ready to proceed with booking.",
                "created_at": "2026-04-01T10:40:00",
                "updated_at": "2026-04-01T10:40:00",
            },
            {
                "id": "sfb_002",
                "lead_id": "lead_002",
                "rating_experience": 4,
                "rating_comfort": 4,
                "rating_advisor": 5,
                "next_intent": "Needs Time to Decide",
                "follow_up_date": "2026-04-05",
                "notes": "Wants finance illustration shared.",
                "created_at": "2026-03-31T16:20:00",
                "updated_at": "2026-03-31T16:20:00",
            },
            {
                "id": "sfb_003",
                "lead_id": "lead_006",
                "rating_experience": 4,
                "rating_comfort": 4,
                "rating_advisor": 4,
                "next_intent": "Will Visit Again",
                "follow_up_date": "2026-04-04",
                "notes": "Wants spouse to review vehicle.",
                "created_at": "2026-04-01T17:45:00",
                "updated_at": "2026-04-01T17:45:00",
            },
        ]
        insert_many(conn, "sales_feedback", sales_feedback_rows)

        sales_estimate_rows = [
            {
                "id": "set_001",
                "lead_id": "lead_001",
                "model": "Tata Nexon",
                "variant": "XZ+ · AMT · Diesel",
                "ex_showroom_price": 1080000,
                "road_tax": 108000,
                "insurance": 37800,
                "addons": 15000,
                "handling": 8000,
                "on_road_total": 1248800,
                "reviewed_at": "2026-04-01T11:00:00",
                "created_at": "2026-04-01T11:00:00",
                "updated_at": "2026-04-01T11:00:00",
            }
        ]
        insert_many(conn, "sales_estimates", sales_estimate_rows)

        sales_booking_rows = [
            {
                "id": "sbk_001",
                "lead_id": "lead_001",
                "booking_no": "BK-2026-0001",
                "model": "Tata Nexon",
                "variant": "XZ+ · AMT · Diesel",
                "color_preference": "Pristine White",
                "finance_type": "Finance / Loan",
                "booking_date": "2026-04-01",
                "advance_amount": 30000,
                "payment_mode": "UPI",
                "payment_ref": "UPI-SALES-240401",
                "payment_received": 1,
                "expected_delivery_date": "2026-04-15",
                "delivery_location": "Kochi Showroom",
                "special_requests": "Need seat cover package details.",
                "status": "Soft Booked",
                "created_at": "2026-04-01T11:20:00",
                "updated_at": "2026-04-01T11:20:00",
            }
        ]
        insert_many(conn, "sales_bookings", sales_booking_rows)


if __name__ == "__main__":
    seed_data()
    print("Database seeded successfully.")
