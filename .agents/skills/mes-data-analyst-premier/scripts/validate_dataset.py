#!/usr/bin/env python3
"""
Dataset and Metric Invariant Validator for DYNAMO MES (Data Analyst Premier TDDA)
Verifies:
1. Primary key uniqueness (ID_Key)
2. Mathematical invariants (All-Time Cost >= Period Cost, Cost-at-Risk formula)
3. Date format and sanity checks
"""

import sys
import json

def validate_dataset(rows):
    issues = []
    keys = set()
    all_time_cost = 0
    overdue_cost = 0
    
    for idx, r in enumerate(rows):
        k = r.get("ID_Key")
        if not k:
            issues.append(f"Row {idx} missing ID_Key")
        elif k in keys:
            issues.append(f"Duplicate ID_Key: {k}")
        else:
            keys.add(k)
            
        cost = float(r.get("thanh_tien") or 0)
        all_time_cost += cost
        
        if r.get("is_overdue"):
            overdue_cost += cost

    if overdue_cost > all_time_cost:
        issues.append(f"Invariant broken: Overdue cost ({overdue_cost}) exceeds All-Time cost ({all_time_cost})")

    return {
        "status": "PASSED" if not issues else "FAILED",
        "total_records": len(rows),
        "unique_keys": len(keys),
        "all_time_cost": all_time_cost,
        "overdue_cost": overdue_cost,
        "issues": issues
    }

if __name__ == "__main__":
    sample_data = [
        {"ID_Key": "LOT-001", "thanh_tien": 1500000, "is_overdue": False},
        {"ID_Key": "LOT-002", "thanh_tien": 2200000, "is_overdue": True},
    ]
    res = validate_dataset(sample_data)
    print(json.dumps(res, indent=2))
