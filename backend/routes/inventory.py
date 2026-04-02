from fastapi import APIRouter, Query

from db.database import db_cursor
from services.estimates import availability_status
from services.inventory_filters import infer_inventory_filters
from services.logger import get_logger


router = APIRouter(prefix="/api/inventory", tags=["inventory"])
logger = get_logger("routes.inventory")


@router.get("")
def get_inventory(
    category: str | None = Query(default=None),
    workflow: bool = Query(default=False),
    issues: str | None = Query(default=None),
    service_codes: str | None = Query(default=None),
    selected_services: str | None = Query(default=None),
):
    with db_cursor() as conn:
        categories: list[str] = []
        part_names: list[str] = []
        if workflow:
            parsed_issues = [item.strip() for item in (issues or "").split("|") if item.strip()]
            parsed_codes = [item.strip() for item in (service_codes or "").split("|") if item.strip()]
            parsed_services = [item.strip() for item in (selected_services or "").split("|") if item.strip()]
            filters = infer_inventory_filters(parsed_issues, parsed_codes, parsed_services)
            categories = filters["categories"]
            part_names = filters["part_names"]
            params: list[str] = []
            if part_names:
                part_placeholders = ",".join("?" for _ in part_names)
                where_clause = f"part_name IN ({part_placeholders})"
                params.extend(part_names)
            elif categories:
                category_placeholders = ",".join("?" for _ in categories)
                where_clause = f"category IN ({category_placeholders})"
                params.extend(categories)
            else:
                where_clause = "category IN ('Filters','Lubricants','Fluids')"
            query = f"SELECT * FROM inventory WHERE {where_clause} ORDER BY category, part_name"
            logger.info(
                "Workflow inventory lookup started with %s categories and %s mapped parts.",
                len(categories),
                len(part_names),
            )
            rows = conn.execute(query, params).fetchall()
        else:
            rows = conn.execute("SELECT * FROM inventory WHERE (? IS NULL OR category = ?) ORDER BY category, part_name", (category, category)).fetchall()
        items = []
        for row in rows:
            item = dict(row)
            item["availability_status"] = availability_status(item["stock_qty"], item["reorder_level"], item["source_location"])
            items.append(item)
        return {"items": items, "workflow": workflow, "categories": categories}
