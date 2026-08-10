#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
STUDIO EMPIRE — TYCOON ENGINE MONOLITH
Version: 2.5.0-GOLDEN
License: Self-contained standard-library only (sys, math, random, json)
Architecture: 5-Pillar Framework (WHO / WHAT / WHERE / WHY / HOW)

Deterministic-friendly: seeded RNG; integer cash/fans; historical floor 10.0
=============================================================================
"""

from __future__ import annotations

import json
import math
import random
import sys
from copy import deepcopy
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Tuple


# =============================================================================
# PILLAR 4 — DETERMINISTIC MATH HELPERS (WHY)
# =============================================================================

ENGINE_VERSION = "2.5.0-GOLDEN"
HISTORICAL_AVERAGE_FLOOR = 10.0
PLATFORM_TAX_RATE = 0.15
UNIT_PRICE_DEFAULT = 9.99
T_ENGINE_CASH = 500_000
T_ENGINE_RP = 150
GARAGE_RENT = 8_000
START_CASH = 75_000
START_RP = 40
START_HIST = 35.0


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def int_cash(n: float) -> int:
    return int(round(n))


def int_fans(n: float) -> int:
    return max(0, int(math.floor(n)))


def round1(n: float) -> float:
    return round(float(n), 1)


def genre_level_from_exp(exp_points: int) -> int:
    """Level 1 at 0–4 exp, Level 2 at 5–9, Level 3 at 10–14, …"""
    return 1 + max(0, int(exp_points)) // 5


def genre_expertise_multiplier(level: int) -> float:
    """Final_Points = Base_Points * (1.0 + (Current_Genre_Level * 0.05))"""
    return 1.0 + (float(level) * 0.05)


def apply_t_engine_bugs(base_bugs: int, has_t_engine: bool) -> int:
    """Active_Dev_Bugs = MAX(0, Base_Calculated_Bugs // 2) when T-Engine."""
    if not has_t_engine:
        return max(0, int(base_bugs))
    return max(0, int(base_bugs) // 2)


def apply_t_engine_review(raw_score: float, has_t_engine: bool, uses_3d: bool) -> float:
    """Final_Review_Score = CLAMP(Raw + 0.5, 1..10) if T-Engine + 3D."""
    score = float(raw_score)
    if has_t_engine and uses_3d:
        score += 0.5
    return clamp(round1(score), 1.0, 10.0)


def roi_percent(net_revenue: float, dev_cost: float, mkt_cost: float) -> float:
    """ROI_Percent = (Net_Revenue / (Dev + Marketing)) * 100.0"""
    denom = max(1.0, float(dev_cost) + float(mkt_cost))
    return round((float(net_revenue) / denom) * 100.0, 2)


def combo_multiplier(topic: str, genre: str) -> float:
    t = topic.strip().lower()
    g = genre.strip().lower()
    goods = {
        ("sci-fi", "action"),
        ("fantasy", "rpg"),
        ("city", "simulation"),
        ("casual", "casual"),
        ("space", "action"),
        ("medieval", "rpg"),
    }
    bads = {
        ("casual", "action"),
        ("city", "horror"),
        ("dating", "action"),
    }
    if (t, g) in goods or (g, t) in goods:
        return 1.3
    if (t, g) in bads:
        return 0.7
    # Soft defaults
    if g == "action" and t in ("sci-fi", "space", "military"):
        return 1.3
    if g == "simulation" and t in ("city", "life", "farm"):
        return 1.3
    return 0.95


def hype_multiplier(hype: float) -> float:
    return 1.0 + (max(0.0, float(hype)) / 100.0)


def compute_review_score(total_points: float, historical_avg: float) -> float:
    """Raw = (points / hist) * 7.0 — TYCOON spine."""
    hist = max(HISTORICAL_AVERAGE_FLOOR, float(historical_avg))
    pts = max(0.0, float(total_points))
    raw = (pts / hist) * 7.0
    return clamp(round1(raw), 1.0, 10.0)


def update_historical(historical_avg: float, total_points: float) -> float:
    hist = max(HISTORICAL_AVERAGE_FLOOR, float(historical_avg))
    nxt = (hist * 0.7) + (float(total_points) * 0.3)
    return max(HISTORICAL_AVERAGE_FLOOR, nxt)


def compute_units_sold(
    total_points: float,
    review: float,
    hype: float,
    platform_share: float,
) -> int:
    """Units = round(points * review^2.3 * 15 * hype_mult * share)"""
    pts = max(1.0, float(total_points))
    rev = clamp(float(review), 1.0, 10.0)
    hm = hype_multiplier(hype)
    share = max(0.05, float(platform_share))
    return max(0, int(round(pts * (rev ** 2.3) * 15.0 * hm * share)))


# =============================================================================
# PILLAR 2 — COMPONENT REGISTRY (WHAT)
# =============================================================================

PLATFORM_REGISTRY: Dict[str, Dict[str, Any]] = {
    "PC": {
        "name": "PC",
        "license_cost": 0,
        "market_share": 1.0,
        "target_audience": "Everyone",
        "release_year": 1,
        "lifespan_years": 99,
    },
    # Community-expanded legacy platforms (original fiction names)
    "Super_TES": {
        "name": "Super TES (SNES)",
        "license_cost": 120000,
        "market_share": 1.5,
        "target_audience": "Everyone",
        "release_year": 3,
        "lifespan_years": 5,
    },
    "Vena_Gen": {
        "name": "Vena Genesis (MegaDrive)",
        "license_cost": 100000,
        "market_share": 1.3,
        "target_audience": "Young",
        "release_year": 3,
        "lifespan_years": 5,
    },
    "MBox_360": {
        "name": "mBox 360 (Xbox 360)",
        "license_cost": 250000,
        "market_share": 2.1,
        "target_audience": "Mature",
        "release_year": 7,
        "lifespan_years": 7,
    },
    "Play_3": {
        "name": "Playsystem 3 (PS3)",
        "license_cost": 300000,
        "market_share": 2.2,
        "target_audience": "Mature",
        "release_year": 7,
        "lifespan_years": 7,
    },
    "Pip_Phone": {
        "name": "Pip-Phone (iPhone)",
        "license_cost": 40000,
        "market_share": 2.5,
        "target_audience": "Casual",
        "release_year": 8,
        "lifespan_years": 99,
    },
    "TES": {
        "name": "TES (NES)",
        "license_cost": 80000,
        "market_share": 1.4,
        "target_audience": "Kids",
        "release_year": 1,
        "lifespan_years": 4,
    },
    "Gameling": {
        "name": "Gameling (GameBoy)",
        "license_cost": 50000,
        "market_share": 1.2,
        "target_audience": "Kids",
        "release_year": 2,
        "lifespan_years": 5,
    },
}

TOPICS = ["Sci-Fi", "Fantasy", "City", "Casual", "Space", "Medieval", "Military", "Life"]
GENRES = ["Action", "RPG", "Simulation", "Casual"]

ENGINE_PARTS: Dict[str, Dict[str, Any]] = {
    "2D Graphics V2": {"rp": 20, "cash": 15000, "tech_mod": 1.15, "design_mod": 1.05, "is_3d": False},
    "3D Graphics V1": {"rp": 50, "cash": 40000, "tech_mod": 1.35, "design_mod": 1.10, "is_3d": True},
    "Stereo Sound": {"rp": 15, "cash": 8000, "tech_mod": 1.05, "design_mod": 1.10, "is_3d": False},
    "Linear Physics": {"rp": 30, "cash": 20000, "tech_mod": 1.25, "design_mod": 1.00, "is_3d": False},
    "Basic AI": {"rp": 25, "cash": 12000, "tech_mod": 1.15, "design_mod": 1.05, "is_3d": False},
}

MARKETING_TIERS: Dict[str, Dict[str, Any]] = {
    "1": {"name": "Raw Dev Blog Post", "cost": 2000, "min_hype": 5, "max_hype": 12},
    "2": {"name": "Gaming Magazine Ad", "cost": 15000, "min_hype": 20, "max_hype": 45},
    "3": {"name": "G3 Convention Booth", "cost": 65000, "min_hype": 60, "max_hype": 130},
}

STAFF_NAMES = [
    "Alex", "Jordan", "Taylor", "Morgan", "Sam", "Casey", "Jamie",
    "Riley", "Avery", "Quinn", "Blake", "Cameron", "Drew", "Emery",
]


# =============================================================================
# PILLAR 1 — DATA LAYER & OBJECT SCHEMAS (WHO)
# =============================================================================

class GenreExpertiseTracker:
    """Tracks exp_pool and level per genre. +1 exp per ship; level every 5 exp."""

    def __init__(self) -> None:
        self.exp_pool: Dict[str, int] = {g: 0 for g in GENRES}
        self.level: Dict[str, int] = {g: 1 for g in GENRES}

    def get_exp(self, genre: str) -> int:
        return int(self.exp_pool.get(genre, 0))

    def get_level(self, genre: str) -> int:
        return int(self.level.get(genre, 1))

    def multiplier(self, genre: str) -> float:
        return genre_expertise_multiplier(self.get_level(genre))

    def award_ship(self, genre: str) -> Tuple[int, int, bool]:
        """
        Increment exp by +1 after review generation (pre-telemetry).
        Returns (new_exp, new_level, leveled_up).
        """
        g = genre if genre in self.exp_pool else GENRES[0]
        old_level = self.get_level(g)
        self.exp_pool[g] = self.get_exp(g) + 1
        new_level = genre_level_from_exp(self.exp_pool[g])
        self.level[g] = new_level
        return self.exp_pool[g], new_level, new_level > old_level

    def dashboard_lines(self) -> List[str]:
        lines = []
        for g in GENRES:
            lines.append(
                f"  {g:12s}  EXP={self.get_exp(g):3d}  Lv={self.get_level(g)}  "
                f"mult={self.multiplier(g):.2f}x"
            )
        return lines

    def to_dict(self) -> Dict[str, Any]:
        return {"exp_pool": dict(self.exp_pool), "level": dict(self.level)}

    def load_dict(self, data: Dict[str, Any]) -> None:
        self.exp_pool = {g: int(data.get("exp_pool", {}).get(g, 0)) for g in GENRES}
        self.level = {g: genre_level_from_exp(self.exp_pool[g]) for g in GENRES}


class TelemetryLedger:
    """
    Immutable-style history: append-only game_history_records.
    Records capture full post-ship financial and quality telemetry.
    """

    def __init__(self) -> None:
        self.game_history_records: List[Dict[str, Any]] = []

    def append_record(self, record: Dict[str, Any]) -> None:
        # Store a deep copy so later mutations never rewrite history
        self.game_history_records.append(deepcopy(record))

    def build_record(
        self,
        *,
        title: str,
        topic: str,
        genre: str,
        year: int,
        month: int,
        week: int,
        platform: str,
        dev_cost: float,
        marketing_cost: float,
        review_score: float,
        units_sold: int,
        unit_price: float,
        bugs_shipped: int,
        bugs_fixed: int,
        competitor_share_index: float,
    ) -> Dict[str, Any]:
        gross = float(units_sold) * float(unit_price)
        tax = gross * PLATFORM_TAX_RATE
        net = gross - tax
        profit = net - float(dev_cost) - float(marketing_cost)
        roi = roi_percent(net, dev_cost, marketing_cost)
        domination = round(float(competitor_share_index), 3)
        return {
            "Game Title": title,
            "Topic": topic,
            "Genre": genre,
            "Launch Date": f"Y{year}/M{month}/W{week}",
            "Primary Platform": platform,
            "Dev Cost": int_cash(dev_cost),
            "Marketing Cost": int_cash(marketing_cost),
            "Review Score": round1(review_score),
            "Gross Profit": int_cash(gross),  # gross revenue labeled per schema
            "Gross Revenue": int_cash(gross),
            "Platform Taxes": int_cash(tax),
            "Net Profit": int_cash(profit),
            "Net Revenue": int_cash(net),
            "Units Sold": int(units_sold),
            "Total Bugs Shipped": int(bugs_shipped),
            "Total Bugs Fixed": int(bugs_fixed),
            "ROI Percent": roi,
            "Market Share Domination Index": domination,
        }

    def print_dashboard(self, last_n: int = 10) -> None:
        print("\n" + "=" * 72)
        print(" TELEMETRY LEDGER — EXTENDED METRICS DASHBOARD")
        print("=" * 72)
        if not self.game_history_records:
            print("  (no shipped titles yet)")
            print("=" * 72 + "\n")
            return
        rows = self.game_history_records[-last_n:]
        for i, r in enumerate(rows, 1):
            print(f"\n[{i}] {r['Game Title']}  |  {r['Launch Date']}  |  {r['Primary Platform']}")
            print(f"    Topic/Genre : {r['Topic']} / {r['Genre']}")
            print(f"    Review      : {r['Review Score']}/10")
            print(f"    Units       : {r['Units Sold']:,}")
            print(f"    Gross       : ${r['Gross Revenue']:,}")
            print(f"    Tax (15%)   : ${r['Platform Taxes']:,}")
            print(f"    Net Rev     : ${r['Net Revenue']:,}")
            print(f"    Dev+Mkt     : ${r['Dev Cost'] + r['Marketing Cost']:,}")
            print(f"    Net Profit  : ${r['Net Profit']:,}")
            print(f"    ROI         : {r['ROI Percent']}%")
            print(f"    Domination  : {r['Market Share Domination Index']}")
            print(f"    Bugs ship/fix: {r['Total Bugs Shipped']} / {r['Total Bugs Fixed']}")
        # Aggregate
        total_profit = sum(r["Net Profit"] for r in self.game_history_records)
        total_units = sum(r["Units Sold"] for r in self.game_history_records)
        print("\n" + "-" * 72)
        print(f" CAREER TOTALS  profit=${total_profit:,}  units={total_units:,}  "
              f"titles={len(self.game_history_records)}")
        print("=" * 72 + "\n")

    def to_list(self) -> List[Dict[str, Any]]:
        return deepcopy(self.game_history_records)

    def load_list(self, rows: List[Dict[str, Any]]) -> None:
        self.game_history_records = [deepcopy(r) for r in rows]


class EngineProfile:
    def __init__(
        self,
        name: str = "Default Text Core",
        tech_mult: float = 1.0,
        design_mult: float = 1.0,
        has_t_engine: bool = False,
        uses_3d: bool = False,
        parts: Optional[List[str]] = None,
    ) -> None:
        self.name = name
        self.tech_mult = float(tech_mult)
        self.design_mult = float(design_mult)
        self.has_t_engine = bool(has_t_engine)
        self.uses_3d = bool(uses_3d)
        self.parts: List[str] = list(parts or [])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "tech_mult": self.tech_mult,
            "design_mult": self.design_mult,
            "has_t_engine": self.has_t_engine,
            "uses_3d": self.uses_3d,
            "parts": list(self.parts),
        }

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "EngineProfile":
        return EngineProfile(
            name=d.get("name", "Default Text Core"),
            tech_mult=float(d.get("tech_mult", 1.0)),
            design_mult=float(d.get("design_mult", 1.0)),
            has_t_engine=bool(d.get("has_t_engine", False)),
            uses_3d=bool(d.get("uses_3d", False)),
            parts=list(d.get("parts", [])),
        )


class StaffMember:
    def __init__(self, name: str, tech: int, design: int, salary: int, energy: int = 100) -> None:
        self.name = name
        self.tech = int(tech)
        self.design = int(design)
        self.salary = int(salary)
        self.energy = int(energy)

    def weekly_output(self) -> Tuple[float, float]:
        scale = max(0.2, self.energy / 100.0)
        return self.tech * 0.15 * scale, self.design * 0.15 * scale

    def tick_energy(self, working: bool) -> None:
        if not working:
            self.energy = min(100, self.energy + 8)
            return
        if self.energy > 20:
            self.energy = max(0, self.energy - 5)
        else:
            self.energy = min(100, self.energy + 25)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "tech": self.tech,
            "design": self.design,
            "salary": self.salary,
            "energy": self.energy,
        }

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "StaffMember":
        return StaffMember(
            d["name"], int(d["tech"]), int(d["design"]), int(d["salary"]), int(d.get("energy", 100))
        )


class ActiveProject:
    def __init__(
        self,
        title: str,
        topic: str,
        genre: str,
        platform: str,
        uses_3d: bool = False,
    ) -> None:
        self.title = title
        self.topic = topic
        self.genre = genre
        self.platform = platform
        self.uses_3d = uses_3d
        self.phase = 1  # 1..3 production phases, then ship
        self.weeks_left = 4
        self.design_points = 0.0
        self.tech_points = 0.0
        self.bugs = 0
        self.bugs_fixed = 0
        self.dev_cost = 5000.0
        self.marketing_allocated = 0.0
        self.stability_points = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "topic": self.topic,
            "genre": self.genre,
            "platform": self.platform,
            "uses_3d": self.uses_3d,
            "phase": self.phase,
            "weeks_left": self.weeks_left,
            "design_points": self.design_points,
            "tech_points": self.tech_points,
            "bugs": self.bugs,
            "bugs_fixed": self.bugs_fixed,
            "dev_cost": self.dev_cost,
            "marketing_allocated": self.marketing_allocated,
            "stability_points": self.stability_points,
        }

    @staticmethod
    def from_dict(d: Dict[str, Any]) -> "ActiveProject":
        p = ActiveProject(d["title"], d["topic"], d["genre"], d["platform"], bool(d.get("uses_3d", False)))
        p.phase = int(d.get("phase", 1))
        p.weeks_left = int(d.get("weeks_left", 4))
        p.design_points = float(d.get("design_points", 0))
        p.tech_points = float(d.get("tech_points", 0))
        p.bugs = int(d.get("bugs", 0))
        p.bugs_fixed = int(d.get("bugs_fixed", 0))
        p.dev_cost = float(d.get("dev_cost", 0))
        p.marketing_allocated = float(d.get("marketing_allocated", 0))
        p.stability_points = float(d.get("stability_points", 0))
        return p


class StudioState:
    """Global campaign state — finances, audience, inventory, engines."""

    def __init__(self, seed: int = 42) -> None:
        self.seed = int(seed)
        self.rng = random.Random(self.seed)
        self.year = 1
        self.month = 1
        self.week = 1
        self.cash = float(START_CASH)
        self.rp = int(START_RP)
        self.fans = 0
        self.hype = 0
        self.historical_average = float(START_HIST)
        self.monthly_rent = float(GARAGE_RENT)
        self.owned_licenses: List[str] = ["PC"]
        self.engine = EngineProfile()
        self.staff: List[StaffMember] = []
        self.hiring_pool: List[StaffMember] = []
        self.project: Optional[ActiveProject] = None
        self.genre_exp = GenreExpertiseTracker()
        self.telemetry = TelemetryLedger()
        self.rival_pressure = 1.0  # competitor market index baseline
        self.game_over = False
        self.log: List[str] = []

    def log_msg(self, msg: str) -> None:
        self.log.append(msg)
        print(msg)

    def payroll(self) -> int:
        return sum(s.salary for s in self.staff)

    def platform_active(self, key: str) -> bool:
        p = PLATFORM_REGISTRY.get(key)
        if not p:
            return False
        if self.year < int(p["release_year"]):
            return False
        end = int(p["release_year"]) + int(p["lifespan_years"]) - 1
        if int(p["lifespan_years"]) >= 99:
            return True
        return self.year <= end

    def platform_share(self, key: str) -> float:
        if key not in self.owned_licenses:
            return 0.0
        if not self.platform_active(key):
            return 0.15  # legacy residual
        return float(PLATFORM_REGISTRY[key]["market_share"])

    def to_save_matrix(self) -> Dict[str, Any]:
        return {
            "v": ENGINE_VERSION,
            "yr": self.year,
            "mo": self.month,
            "wk": self.week,
            "csh": int_cash(self.cash),
            "fan": int_fans(self.fans),
            "rp": int(self.rp),
            "avg": round(self.historical_average, 2),
            "hyp": int(self.hype),
            "lic": list(self.owned_licenses),
            "eng": self.engine.to_dict(),
            "stf": [s.to_dict() for s in self.staff],
            "genre_exp": self.genre_exp.to_dict(),
            "telemetry": self.telemetry.to_list(),
            "project": self.project.to_dict() if self.project else None,
            "seed": self.seed,
            "rival_pressure": self.rival_pressure,
        }

    def load_save_matrix(self, data: Dict[str, Any]) -> None:
        self.year = int(data.get("yr", 1))
        self.month = int(data.get("mo", 1))
        self.week = int(data.get("wk", 1))
        self.cash = float(data.get("csh", START_CASH))
        self.fans = int_fans(data.get("fan", 0))
        self.rp = int(data.get("rp", START_RP))
        self.historical_average = max(
            HISTORICAL_AVERAGE_FLOOR, float(data.get("avg", START_HIST))
        )
        self.hype = int(data.get("hyp", 0))
        self.owned_licenses = list(data.get("lic", ["PC"]))
        self.engine = EngineProfile.from_dict(data.get("eng", {}))
        self.staff = [StaffMember.from_dict(s) for s in data.get("stf", [])]
        self.genre_exp.load_dict(data.get("genre_exp", {}))
        self.telemetry.load_list(data.get("telemetry", []))
        proj = data.get("project")
        self.project = ActiveProject.from_dict(proj) if proj else None
        self.seed = int(data.get("seed", self.seed))
        self.rng = random.Random(self.seed + self.year * 1000 + self.week)
        self.rival_pressure = float(data.get("rival_pressure", 1.0))
        self.game_over = False


class CheatConsole:
    """
    Command router for slash-prefixed cheats and menu option '0'.
    Mutates StudioState instantly without spending time.
    """

    COMMANDS = {
        "/money_boost": "Grant +$5,000,000 cash",
        "/rp_max": "Set research points to 999",
        "/instafans": "Multiply fans by 5x",
        "/bug_wipe": "Wipe active production bugs to 0",
        "/help": "List cheat commands",
    }

    def __init__(self, state: StudioState) -> None:
        self.state = state

    def is_cheat_input(self, raw: str) -> bool:
        s = raw.strip()
        if not s:
            return False
        if s == "0":
            return True
        return s.startswith("/")

    def execute(self, raw: str) -> bool:
        """
        Returns True if input was consumed as a cheat (including help/prompt).
        """
        s = raw.strip()
        if s == "0":
            print("\n--- CHEAT CONSOLE (type /command) ---")
            for k, v in self.COMMANDS.items():
                print(f"  {k:16s}  {v}")
            cmd = input("CHEAT> ").strip()
            if not cmd:
                return True
            return self._run_command(cmd)

        if s.startswith("/"):
            return self._run_command(s)
        return False

    def _run_command(self, cmd: str) -> bool:
        key = cmd.strip().lower().split()[0]
        # normalize
        if not key.startswith("/"):
            key = "/" + key

        st = self.state
        if key in ("/help", "/?"):
            for k, v in self.COMMANDS.items():
                print(f"  {k:16s}  {v}")
            return True

        if key == "/money_boost":
            st.cash = float(int_cash(st.cash + 5_000_000))
            st.log_msg(f"[CHEAT] /money_boost → cash now ${int_cash(st.cash):,}")
            return True

        if key == "/rp_max":
            st.rp = 999
            st.log_msg("[CHEAT] /rp_max → RP = 999")
            return True

        if key == "/instafans":
            st.fans = int_fans(st.fans * 5) if st.fans > 0 else 5
            st.log_msg(f"[CHEAT] /instafans → fans now {st.fans:,}")
            return True

        if key == "/bug_wipe":
            if st.project is None:
                st.log_msg("[CHEAT] /bug_wipe → no active project (no-op)")
            else:
                wiped = st.project.bugs
                st.project.bugs_fixed += wiped
                st.project.bugs = 0
                st.log_msg(f"[CHEAT] /bug_wipe → cleared {wiped} bugs")
            return True

        st.log_msg(f"[CHEAT] Unknown command: {cmd}")
        return True


# =============================================================================
# PILLAR 3 — PIPELINES (WHERE) + CORE ENGINE
# =============================================================================

class TycoonEngine:
    """
    Integrated execution engine: time, development, shipping, menus.
    Injection points:
      - T-Engine during Phase 2 production (bug-halving)
      - Genre EXP after review, before telemetry append
      - CheatConsole at apex of input loop
    """

    def __init__(self, seed: int = 42) -> None:
        self.state = StudioState(seed=seed)
        self.cheats = CheatConsole(self.state)

    # ── Chrono heartbeat ────────────────────────────────────────────────────

    def tick_weeks(self, weeks: int = 1, working: bool = False) -> None:
        st = self.state
        for _ in range(max(0, weeks)):
            if st.game_over:
                return
            st.week += 1
            # Hype decay: max(1, floor(hype*0.12))
            if st.hype > 0:
                decay = max(1, int(st.hype * 0.12))
                st.hype = max(0, st.hype - decay)
            # Staff energy
            for member in st.staff:
                member.tick_energy(working=working and st.project is not None)
            # Month end
            if st.week > 4:
                st.week = 1
                st.month += 1
                burn = st.monthly_rent + st.payroll()
                st.cash = float(int_cash(st.cash - burn))
                st.log_msg(
                    f"💸 Month-end burn −${int_cash(burn):,} "
                    f"(rent ${int_cash(st.monthly_rent):,} + payroll ${st.payroll():,})"
                )
            if st.month > 12:
                st.month = 1
                st.year += 1
                st.rival_pressure = min(2.5, st.rival_pressure + 0.05)
                st.log_msg(f"🎉 New Year — Year {st.year} | rival pressure {st.rival_pressure:.2f}")
            # Bankruptcy halt
            if st.cash < 0:
                st.cash = float(int_cash(st.cash))
                st.log_msg("[GAME OVER] Cash below $0 — company defaulted.")
                st.game_over = True
                return
            st.cash = float(int_cash(st.cash))
            st.fans = int_fans(st.fans)

    # ── Development week (Phase production) ─────────────────────────────────

    def develop_week(self) -> None:
        st = self.state
        p = st.project
        if p is None:
            st.log_msg("❌ No active project.")
            return

        # Base points RANDOM 6–12 slice of 30–50 project band
        base = st.rng.randint(6, 12)
        # Staff contribution
        staff_t = 0.0
        staff_d = 0.0
        for m in st.staff:
            t, d = m.weekly_output()
            staff_t += t
            staff_d += d

        genre_mult = st.genre_exp.multiplier(p.genre)
        combo = combo_multiplier(p.topic, p.genre)

        tech_gain = (base * 0.55 + staff_t) * st.engine.tech_mult * combo * genre_mult
        design_gain = (base * 0.45 + staff_d) * st.engine.design_mult * combo * genre_mult

        # Phase 2: T-Engine stability / bug matrix (injection point)
        phase_bugs = st.rng.randint(0, 4)
        if p.phase == 2 and st.engine.has_t_engine:
            # Stability points +25% of tech gain
            stability = tech_gain * 0.25
            p.stability_points += stability
            phase_bugs = apply_t_engine_bugs(phase_bugs + st.rng.randint(0, 3), True)
            st.log_msg(
                f"  ⚙️ T-Engine Phase 2 stability +{stability:.1f} | bugs halved → {phase_bugs}"
            )
        else:
            phase_bugs = max(0, phase_bugs)

        p.tech_points += tech_gain
        p.design_points += design_gain
        p.bugs += phase_bugs
        p.dev_cost += 800 + st.payroll() * 0.15
        p.weeks_left -= 1

        st.log_msg(
            f"  Dev Y{st.year}M{st.month}W{st.week} phase {p.phase}: "
            f"+T{tech_gain:.1f} +D{design_gain:.1f} bugs={p.bugs} "
            f"(genre mult {genre_mult:.2f}x)"
        )

        if p.weeks_left <= 0:
            if p.phase < 3:
                p.phase += 1
                p.weeks_left = 1 if p.phase == 3 else 2
                st.log_msg(f"  → Entering production phase {p.phase}")
            else:
                st.log_msg("  → Project ready to SHIP (use menu option 2).")

        self.tick_weeks(1, working=True)

    # ── Ship game (post-calculation pipeline) ───────────────────────────────

    def ship_game(self) -> None:
        st = self.state
        p = st.project
        if p is None:
            st.log_msg("❌ No active project to ship.")
            return
        if p.phase < 3 or p.weeks_left > 0:
            # Allow early ship with penalty
            st.log_msg("⚠️ Shipping early — quality penalty applied.")
            early_pen = 0.85
        else:
            early_pen = 1.0

        # Final bug pass with T-Engine
        base_bugs = p.bugs
        final_bugs = apply_t_engine_bugs(base_bugs, st.engine.has_t_engine)
        bugs_fixed = max(0, base_bugs - final_bugs)
        p.bugs_fixed += bugs_fixed
        p.bugs = final_bugs

        # Points
        total_points = (p.design_points + p.tech_points) * early_pen
        if st.engine.has_t_engine:
            total_points += p.stability_points * 0.5

        # Review
        raw_review = compute_review_score(total_points, st.historical_average)
        # Bug damp
        bug_damp = clamp(1.0 - (final_bugs / 80.0), 0.7, 1.0)
        raw_review = clamp(round1(raw_review * bug_damp), 1.0, 10.0)
        uses_3d = p.uses_3d or st.engine.uses_3d
        final_review = apply_t_engine_review(raw_review, st.engine.has_t_engine, uses_3d)

        # Historical trail (after score)
        st.historical_average = update_historical(st.historical_average, total_points)

        # --- Genre expertise AFTER review, BEFORE telemetry (injection) ---
        exp, lvl, leveled = st.genre_exp.award_ship(p.genre)
        if leveled:
            st.log_msg(f"⭐ {p.genre} expertise LEVEL UP → Lv{lvl} (exp={exp})")
        else:
            st.log_msg(f"📚 {p.genre} expertise +1 exp (exp={exp}, Lv{lvl})")

        # Sales
        share = st.platform_share(p.platform)
        units = compute_units_sold(total_points, final_review, st.hype, share)
        # Soft rival pressure
        units = max(0, int(units / max(0.5, st.rival_pressure * 0.85)))
        price = UNIT_PRICE_DEFAULT
        gross = units * price
        tax = gross * PLATFORM_TAX_RATE
        net = gross - tax

        st.cash = float(int_cash(st.cash + net))
        fan_gain = int_fans(units * 0.04 * (final_review / 10.0))
        st.fans = int_fans(st.fans + fan_gain)
        st.rp += st.rng.randint(8, 15)
        mkt = p.marketing_allocated
        st.hype = 0  # spent at launch

        domination = round(share / max(0.1, st.rival_pressure), 3)

        record = st.telemetry.build_record(
            title=p.title,
            topic=p.topic,
            genre=p.genre,
            year=st.year,
            month=st.month,
            week=st.week,
            platform=p.platform,
            dev_cost=p.dev_cost,
            marketing_cost=mkt,
            review_score=final_review,
            units_sold=units,
            unit_price=price,
            bugs_shipped=final_bugs,
            bugs_fixed=p.bugs_fixed,
            competitor_share_index=domination,
        )
        st.telemetry.append_record(record)

        st.log_msg("\n" + "=" * 60)
        st.log_msg(f"📦 SHIPPED: {p.title}")
        st.log_msg(f"   Review {final_review}/10 | Units {units:,} | Net +${int_cash(net):,}")
        st.log_msg(f"   ROI {record['ROI Percent']}% | Domination {domination}")
        st.log_msg(f"   Bugs shipped {final_bugs} (fixed {p.bugs_fixed}) | hist_avg {st.historical_average:.1f}")
        st.log_msg("=" * 60)
        self._print_release_telemetry(record)

        st.project = None
        self.tick_weeks(0)  # normalize integers only

    def _print_release_telemetry(self, record: Dict[str, Any]) -> None:
        print("\n┌─ RELEASE TELEMETRY ─────────────────────────────────────┐")
        print(f"│ Title     {record['Game Title'][:40]:40s} │")
        print(f"│ Score     {record['Review Score']}/10".ljust(58) + "│")
        print(f"│ Units     {record['Units Sold']:,}".ljust(58) + "│")
        print(f"│ Gross     ${record['Gross Revenue']:,}".ljust(58) + "│")
        print(f"│ Tax       ${record['Platform Taxes']:,}".ljust(58) + "│")
        print(f"│ Net Rev   ${record['Net Revenue']:,}".ljust(58) + "│")
        print(f"│ Profit    ${record['Net Profit']:,}".ljust(58) + "│")
        print(f"│ ROI       {record['ROI Percent']}%".ljust(58) + "│")
        print(f"│ Dominate  {record['Market Share Domination Index']}".ljust(58) + "│")
        print("└─────────────────────────────────────────────────────────┘\n")

    # ── Actions ─────────────────────────────────────────────────────────────

    def start_project(
        self,
        title: str,
        topic: str,
        genre: str,
        platform: str,
    ) -> bool:
        st = self.state
        if st.project is not None:
            st.log_msg("❌ Already developing a project.")
            return False
        if platform not in st.owned_licenses:
            st.log_msg(f"❌ No license for {platform}. Buy a dev kit first.")
            return False
        if not st.platform_active(platform):
            st.log_msg(f"⚠️ {platform} is off primary lifecycle — residual market only.")
        if genre not in GENRES:
            st.log_msg(f"❌ Genre must be one of {GENRES}")
            return False
        if topic not in TOPICS:
            st.log_msg(f"❌ Topic must be one of {TOPICS}")
            return False
        uses_3d = st.engine.uses_3d
        st.project = ActiveProject(title.strip() or f"{topic} {genre}", topic, genre, platform, uses_3d)
        st.project.dev_cost = 4000 + len(st.staff) * 500
        st.log_msg(
            f"🚀 Started '{st.project.title}' [{topic}/{genre}] on {platform} "
            f"(3D={uses_3d}, T-Engine={st.engine.has_t_engine})"
        )
        return True

    def run_marketing(self, tier_key: str) -> bool:
        st = self.state
        cfg = MARKETING_TIERS.get(tier_key)
        if not cfg:
            st.log_msg("❌ Invalid marketing tier.")
            return False
        cost = int(cfg["cost"])
        if st.cash < cost:
            st.log_msg(f"❌ Need ${cost:,} for {cfg['name']}. Cash preserved.")
            return False
        st.cash = float(int_cash(st.cash - cost))
        gained = st.rng.randint(int(cfg["min_hype"]), int(cfg["max_hype"]))
        st.hype += gained
        if st.project is not None:
            st.project.marketing_allocated += cost
        st.log_msg(f"📣 {cfg['name']}: −${cost:,} +{gained} hype (now {st.hype})")
        self.tick_weeks(1, working=False)
        return True

    def build_custom_engine(self, part_keys: List[str], attach_t_engine: bool) -> bool:
        st = self.state
        tech = 1.0
        design = 1.0
        cash_cost = 0
        rp_cost = 0
        uses_3d = False
        valid_parts: List[str] = []
        for k in part_keys:
            part = ENGINE_PARTS.get(k)
            if not part:
                st.log_msg(f"⚠️ Unknown part skipped: {k}")
                continue
            tech *= float(part["tech_mod"])
            design *= float(part["design_mod"])
            cash_cost += int(part["cash"])
            rp_cost += int(part["rp"])
            uses_3d = uses_3d or bool(part["is_3d"])
            valid_parts.append(k)

        if attach_t_engine:
            cash_cost += T_ENGINE_CASH
            rp_cost += T_ENGINE_RP

        if st.cash < cash_cost:
            st.log_msg(f"❌ Need ${cash_cost:,}. State preserved.")
            return False
        if st.rp < rp_cost:
            st.log_msg(f"❌ Need {rp_cost} RP. State preserved.")
            return False

        st.cash = float(int_cash(st.cash - cash_cost))
        st.rp -= rp_cost
        name = "Studio Engine"
        if valid_parts:
            name = " + ".join(valid_parts[:2])
        if attach_t_engine:
            name += " · T-Engine"

        st.engine = EngineProfile(
            name=name,
            tech_mult=round(tech, 3),
            design_mult=round(design, 3),
            has_t_engine=attach_t_engine,
            uses_3d=uses_3d,
            parts=valid_parts,
        )
        st.log_msg(
            f"🛠️ Engine compiled: {st.engine.name} | tech×{st.engine.tech_mult} "
            f"design×{st.engine.design_mult} | T-Engine={attach_t_engine} | "
            f"−${cash_cost:,} −{rp_cost} RP"
        )
        return True

    def license_platform(self, key: str) -> bool:
        st = self.state
        if key not in PLATFORM_REGISTRY:
            st.log_msg("❌ Unknown platform.")
            return False
        if key in st.owned_licenses:
            st.log_msg("Already licensed.")
            return False
        plat = PLATFORM_REGISTRY[key]
        if st.year < int(plat["release_year"]):
            st.log_msg(f"❌ {plat['name']} not released until Year {plat['release_year']}.")
            return False
        cost = int(plat["license_cost"])
        if st.cash < cost:
            st.log_msg(f"❌ Need ${cost:,}. State preserved.")
            return False
        st.cash = float(int_cash(st.cash - cost))
        st.owned_licenses.append(key)
        st.log_msg(f"📀 Licensed {plat['name']} (−${cost:,})")
        return True

    def generate_hiring_pool(self, investment: int) -> bool:
        st = self.state
        if st.cash < investment:
            st.log_msg("❌ Insufficient funds for recruiting. State preserved.")
            return False
        st.cash = float(int_cash(st.cash - investment))
        st.hiring_pool = []
        stat_min = max(10, investment // 1000)
        stat_max = max(30, investment // 400)
        for _ in range(3):
            t = st.rng.randint(stat_min, stat_max)
            d = st.rng.randint(stat_min, stat_max)
            sal = int((t + d) * 12.5)
            name = st.rng.choice(STAFF_NAMES) + " " + st.rng.choice(["Lee", "Ng", "Ortiz", "Kim", "Shaw"])
            st.hiring_pool.append(StaffMember(name, t, d, sal))
        st.log_msg(f"👥 Hiring pool generated (−${investment:,}):")
        for i, m in enumerate(st.hiring_pool):
            st.log_msg(f"  [{i}] {m.name} T{m.tech} D{m.design} ${m.salary}/mo")
        return True

    def hire_from_pool(self, index: int) -> bool:
        st = self.state
        if index < 0 or index >= len(st.hiring_pool):
            st.log_msg("❌ Invalid candidate index.")
            return False
        if len(st.staff) >= 8:
            st.log_msg("❌ Staff cap (8) reached.")
            return False
        m = st.hiring_pool.pop(index)
        st.staff.append(m)
        st.log_msg(f"✅ Hired {m.name} (${m.salary}/mo)")
        return True

    def save_to_file(self, path: str) -> None:
        data = self.state.to_save_matrix()
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"💾 Saved → {path}")

    def load_from_file(self, path: str) -> bool:
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.state.load_save_matrix(data)
            self.cheats = CheatConsole(self.state)
            print(f"📂 Loaded ← {path}")
            return True
        except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
            print(f"❌ Load failed: {e}")
            return False

    # ── Dashboard ───────────────────────────────────────────────────────────

    def print_dashboard(self) -> None:
        st = self.state
        print("\n" + "█" * 72)
        print(f"  STUDIO EMPIRE TYCOON ENGINE  v{ENGINE_VERSION}")
        print("█" * 72)
        print(
            f"  Date  Y{st.year} M{st.month} W{st.week}   |   "
            f"Cash ${int_cash(st.cash):,}   |   Fans {int_fans(st.fans):,}   |   RP {st.rp}"
        )
        print(
            f"  Hype {st.hype}   |   HistAvg {st.historical_average:.1f}   |   "
            f"Rent ${int_cash(st.monthly_rent):,}/mo   |   Payroll ${st.payroll():,}/mo"
        )
        print(f"  Engine: {st.engine.name}  tech×{st.engine.tech_mult} design×{st.engine.design_mult} "
              f"T-Engine={st.engine.has_t_engine} 3D={st.engine.uses_3d}")
        print(f"  Licenses: {', '.join(st.owned_licenses)}")
        print("  Genre Expertise:")
        for line in st.genre_exp.dashboard_lines():
            print(line)
        if st.project:
            p = st.project
            print(
                f"  PROJECT: {p.title} [{p.topic}/{p.genre}] {p.platform} "
                f"phase {p.phase} weeks_left={p.weeks_left}"
            )
            print(
                f"           T{p.tech_points:.1f} D{p.design_points:.1f} "
                f"bugs={p.bugs} dev_cost=${int_cash(p.dev_cost):,}"
            )
        else:
            print("  PROJECT: (none)")
        print(f"  Staff ({len(st.staff)}): " + (
            ", ".join(f"{s.name}[E{s.energy}]" for s in st.staff) if st.staff else "(solo founder)"
        ))
        print(f"  Titles shipped: {len(st.telemetry.game_history_records)} | Rival pressure {st.rival_pressure:.2f}")
        print("█" * 72)

    def print_menu(self) -> None:
        print(
            """
  MAIN MENU
  ─────────────────────────────────────────
   1) Start new game project
   2) Advance development week / Ship when ready
   3) Ship game now (if in production)
   4) Marketing campaign
   5) Build custom engine (+ optional T-Engine)
   6) License platform dev kit
   7) Recruit / hire staff
   8) View telemetry ledger & analytics
   9) Save / Load campaign
   0) Cheat console  (or type /money_boost etc.)
   T) Tick one idle week
   Q) Quit
  ─────────────────────────────────────────
  Tip: slash commands work anytime: /money_boost /rp_max /instafans /bug_wipe
"""
        )


# =============================================================================
# PILLAR 5 — INTERACTIVE MAIN LOOP (HOW)
# =============================================================================

def prompt(msg: str) -> str:
    try:
        return input(msg).strip()
    except EOFError:
        return "q"


def menu_start_project(engine: TycoonEngine) -> None:
    st = engine.state
    print("\nTopics:", ", ".join(TOPICS))
    topic = prompt("Topic: ") or "Sci-Fi"
    print("Genres:", ", ".join(GENRES))
    genre = prompt("Genre: ") or "Action"
    print("Owned platforms:", ", ".join(st.owned_licenses))
    platform = prompt("Platform: ") or "PC"
    title = prompt("Game title: ") or f"{topic} {genre} Chronicles"
    engine.start_project(title, topic, genre, platform)


def menu_dev_or_ship(engine: TycoonEngine) -> None:
    st = engine.state
    if st.project is None:
        st.log_msg("No project — start one first.")
        return
    p = st.project
    if p.phase >= 3 and p.weeks_left <= 0:
        confirm = prompt("Project complete. Ship now? [Y/n]: ").lower()
        if confirm in ("", "y", "yes"):
            engine.ship_game()
        else:
            engine.develop_week()
    else:
        engine.develop_week()
        # Auto-offer ship when ready
        if st.project and st.project.phase >= 3 and st.project.weeks_left <= 0:
            if prompt("Ready to ship. Ship now? [Y/n]: ").lower() in ("", "y", "yes"):
                engine.ship_game()


def menu_marketing(engine: TycoonEngine) -> None:
    print("\nMarketing tiers:")
    for k, v in MARKETING_TIERS.items():
        print(f"  [{k}] {v['name']} — ${v['cost']:,} (hype {v['min_hype']}-{v['max_hype']})")
    key = prompt("Select tier: ")
    engine.run_marketing(key)


def menu_engine_builder(engine: TycoonEngine) -> None:
    print("\nEngine parts:")
    keys = list(ENGINE_PARTS.keys())
    for i, k in enumerate(keys):
        p = ENGINE_PARTS[k]
        print(f"  [{i}] {k}  ${p['cash']:,}  {p['rp']} RP  "
              f"T×{p['tech_mod']} D×{p['design_mod']}  3D={p['is_3d']}")
    raw = prompt("Select part indices comma-separated (or blank for none): ")
    chosen: List[str] = []
    if raw:
        for part in raw.split(","):
            part = part.strip()
            if part.isdigit() and 0 <= int(part) < len(keys):
                chosen.append(keys[int(part)])
    t_flag = prompt(f"Attach T-Engine Modular Framework (+${T_ENGINE_CASH:,} +{T_ENGINE_RP} RP)? [y/N]: ")
    attach = t_flag.lower() in ("y", "yes")
    engine.build_custom_engine(chosen, attach_t_engine=attach)


def menu_license(engine: TycoonEngine) -> None:
    st = engine.state
    print("\nPlatform registry:")
    for key, p in PLATFORM_REGISTRY.items():
        owned = "OWNED" if key in st.owned_licenses else "----"
        active = "ON" if st.platform_active(key) else "off"
        print(
            f"  {key:12s} {p['name'][:28]:28s} yr{p['release_year']}-"
            f"life{p['lifespan_years']}  ${p['license_cost']:,}  "
            f"share {p['market_share']}  [{owned}/{active}]"
        )
    key = prompt("License key: ")
    engine.license_platform(key)


def menu_staff(engine: TycoonEngine) -> None:
    print("\n  [1] Generate hiring pool (invest cash)")
    print("  [2] Hire from pool by index")
    print("  [3] List staff")
    sub = prompt("Staff menu: ")
    if sub == "1":
        inv = prompt("Recruiting investment (e.g. 5000): ")
        try:
            engine.generate_hiring_pool(int(inv))
        except ValueError:
            print("❌ Invalid amount.")
    elif sub == "2":
        if not engine.state.hiring_pool:
            print("Pool empty — generate first.")
            return
        for i, m in enumerate(engine.state.hiring_pool):
            print(f"  [{i}] {m.name} T{m.tech} D{m.design} ${m.salary}/mo")
        idx = prompt("Index: ")
        try:
            engine.hire_from_pool(int(idx))
        except ValueError:
            print("❌ Invalid index.")
    else:
        if not engine.state.staff:
            print("(no staff)")
        for s in engine.state.staff:
            print(f"  {s.name} T{s.tech} D{s.design} E{s.energy} ${s.salary}/mo")


def menu_save_load(engine: TycoonEngine) -> None:
    print("\n  [1] Save to JSON file")
    print("  [2] Load from JSON file")
    print("  [3] Print save matrix to console")
    sub = prompt("Save/Load: ")
    if sub == "1":
        path = prompt("Path [studio_save.json]: ") or "studio_save.json"
        engine.save_to_file(path)
    elif sub == "2":
        path = prompt("Path [studio_save.json]: ") or "studio_save.json"
        engine.load_from_file(path)
    else:
        print(json.dumps(engine.state.to_save_matrix(), indent=2))


def run_main_loop(seed: int = 42) -> None:
    engine = TycoonEngine(seed=seed)
    st = engine.state
    print(
        f"""
╔══════════════════════════════════════════════════════════════════════╗
║  STUDIO EMPIRE — TYCOON ENGINE MONOLITH  v{ENGINE_VERSION:10s}          ║
║  5-Pillar Architecture · stdlib only · deterministic-friendly        ║
║  Genre EXP · T-Engine · Telemetry · Expanded Platforms · Cheats      ║
╚══════════════════════════════════════════════════════════════════════╝
"""
    )
    st.log_msg(
        f"[SYSTEM] Initialized Garage | Cash ${int_cash(st.cash):,} | "
        f"RP {st.rp} | HistAvg {st.historical_average}"
    )

    while True:
        if st.game_over:
            print("\n[GAME OVER] Load a save or restart the program.")
            if prompt("Load save? [y/N]: ").lower() in ("y", "yes"):
                path = prompt("Path: ") or "studio_save.json"
                if engine.load_from_file(path):
                    continue
            break

        engine.print_dashboard()
        engine.print_menu()
        choice = prompt("Command> ")

        # Apex: CheatConsole intercepts before numeric routing
        if engine.cheats.is_cheat_input(choice):
            engine.cheats.execute(choice)
            continue

        c = choice.lower()
        if c in ("q", "quit", "exit"):
            print("Session ended.")
            break
        if c == "1":
            menu_start_project(engine)
        elif c == "2":
            menu_dev_or_ship(engine)
        elif c == "3":
            engine.ship_game()
        elif c == "4":
            menu_marketing(engine)
        elif c == "5":
            menu_engine_builder(engine)
        elif c == "6":
            menu_license(engine)
        elif c == "7":
            menu_staff(engine)
        elif c == "8":
            st.telemetry.print_dashboard()
        elif c == "9":
            menu_save_load(engine)
        elif c in ("t", "tick"):
            engine.tick_weeks(1, working=False)
            st.log_msg("Idle week advanced.")
        else:
            print("Unknown option. Enter 0–9, T, Q, or a /cheat command.")


def self_test() -> None:
    """Non-interactive smoke test for CI / sanity."""
    eng = TycoonEngine(seed=7)
    assert eng.state.cash == START_CASH
    eng.cheats.execute("/money_boost")
    assert eng.state.cash == START_CASH + 5_000_000
    eng.cheats.execute("/rp_max")
    assert eng.state.rp == 999
    eng.state.fans = 100
    eng.cheats.execute("/instafans")
    assert eng.state.fans == 500
    ok = eng.start_project("Test Game", "Sci-Fi", "Action", "PC")
    assert ok and eng.state.project is not None
    eng.state.project.bugs = 10
    eng.cheats.execute("/bug_wipe")
    assert eng.state.project.bugs == 0
    # Expertise math
    assert genre_level_from_exp(0) == 1
    assert genre_level_from_exp(5) == 2
    assert genre_level_from_exp(10) == 3
    assert abs(genre_expertise_multiplier(2) - 1.10) < 1e-9
    assert apply_t_engine_bugs(9, True) == 4
    assert apply_t_engine_review(7.0, True, True) == 7.5
    # Ship path
    for _ in range(6):
        eng.develop_week()
    eng.ship_game()
    assert len(eng.state.telemetry.game_history_records) == 1
    assert eng.state.genre_exp.get_exp("Action") == 1
    # T-engine purchase insufficient funds path preserves when broke
    eng.state.cash = 100
    eng.state.rp = 10
    assert eng.build_custom_engine(["3D Graphics V1"], attach_t_engine=True) is False
    assert eng.state.cash == 100
    print("[self_test] ALL CHECKS PASSED")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ("--test", "-t"):
        self_test()
        sys.exit(0)
    seed = 42
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        seed = int(sys.argv[1])
    try:
        run_main_loop(seed=seed)
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(0)
