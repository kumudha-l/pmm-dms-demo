def get_dashboard_summary(conn) -> dict:
    kpis = {
        "openJobs": conn.execute("SELECT COUNT(*) FROM job_cards WHERE status NOT IN ('Closed', 'Cancelled')").fetchone()[0],
        "pendingApprovals": conn.execute("SELECT COUNT(*) FROM job_cards WHERE approval_status IN ('Pending', 'Re-approval Required')").fetchone()[0],
        "inProgress": conn.execute("SELECT COUNT(*) FROM job_cards WHERE status IN ('Assigned', 'In Progress', 'Work Completed', 'Billing In Progress')").fetchone()[0],
        "paymentPending": conn.execute("SELECT COUNT(*) FROM job_cards WHERE payment_status != 'Paid'").fetchone()[0],
    }
    recent_job_cards = [
        dict(row)
        for row in conn.execute(
            """
            SELECT jc.id, jc.job_card_no, jc.status, jc.payment_status, jc.approval_status,
                   v.reg_no, v.make, v.model, c.name AS customer_name
            FROM job_cards jc
            JOIN vehicles v ON v.id = jc.vehicle_id
            JOIN customers c ON c.id = jc.customer_id
            ORDER BY jc.created_at DESC
            LIMIT 8
            """
        ).fetchall()
    ]
    scenarios = [
        {"label": "Routine 1st Service", "regNo": "KL13MN7890", "complaintText": "1st free service, pickup and drop requested", "jobCardId": "jc_007"},
        {"label": "Routine 2nd Service", "regNo": "KL07AB1234", "complaintText": "Brake noise from front, also need free service", "jobCardId": "jc_001"},
        {"label": "AC & Electrical Issue", "regNo": "KL39EF3456", "complaintText": "AC cooling low and battery warning once", "jobCardId": "jc_003"},
        {"label": "Body Repair + Polish", "regNo": "KL09WX2346", "complaintText": "Body scratch repair and polish", "jobCardId": "jc_010"},
    ]
    return {"kpis": kpis, "recentJobCards": recent_job_cards, "scenarios": scenarios}
