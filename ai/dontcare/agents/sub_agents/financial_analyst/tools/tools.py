from __future__ import annotations
from typing import Any, Iterable, List, Dict, Optional, Tuple
import os, io, zipfile, re, asyncio, time
from datetime import date
from pathlib import Path
import httpx, xmltodict
from dotenv import load_dotenv

__all__ = [
    "set_dart_api_key",
    "search_company",
    "list_filings",
    "get_financials",
    "compute_basic_ratios",
    "fetch_and_analyze_financials",
]

# ────────────────────────────────────────────────────────────────────────────────
# 환경/설정
# ────────────────────────────────────────────────────────────────────────────────

# 루트/부모 경로의 .env도 최대한 읽어서 DART_API_KEY를 잡아온다.
load_dotenv(Path(__file__).resolve().parent / ".env", override=False)
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)

_BASE = os.getenv("DART_API_BASE_URL")
if not _BASE:
    raise RuntimeError("DART_API_BASE_URL 환경변수가 설정되지 않았습니다")
_DART_KEY = os.getenv("DART_API_KEY")

def set_dart_api_key(key: str) -> None:
    """코드에서 직접 DART_API_KEY를 설정하고 싶을 때 사용."""
    global _DART_KEY
    _DART_KEY = key

# HTTP 타임아웃/커넥션 제한
_HTTP_TIMEOUT = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)
_HTTP_LIMITS  = httpx.Limits(max_keepalive_connections=16, max_connections=32)

async def _get(url: str, params: Dict[str, Any], max_retries: int = 3) -> httpx.Response:
    """GET with retry/backoff for 429/5xx → 실패 시 RuntimeError('RATE_LIMIT'|'DART_DOWN')"""
    if not _DART_KEY:
        raise RuntimeError("DART_API_KEY가 설정되지 않았습니다. set_dart_api_key() 또는 환경변수 설정 필요.")
    params = {**params, "crtfc_key": _DART_KEY}
    delay = 0.8
    last_exc: Optional[Exception] = None
    for i in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, limits=_HTTP_LIMITS) as s:
                r = await s.get(url, params=params)
            if r.status_code in (429, 500, 502, 503, 504):
                if i < max_retries - 1:
                    await asyncio.sleep(delay); delay *= 1.8
                    continue
            r.raise_for_status()
            return r
        except httpx.HTTPStatusError as e:
            last_exc = e
            code = e.response.status_code if e.response is not None else None
            if code in (429, 500, 502, 503, 504) and i < max_retries - 1:
                await asyncio.sleep(delay); delay *= 1.8
                continue
            break
        except Exception as e:
            last_exc = e
            if i < max_retries - 1:
                await asyncio.sleep(delay); delay *= 1.8
                continue
            break
    # 재시도 실패 → 상태코드화
    code = getattr(getattr(last_exc, "response", None), "status_code", None)
    if code in (429,):
        raise RuntimeError("RATE_LIMIT")
    raise RuntimeError("DART_DOWN")

# ────────────────────────────────────────────────────────────────────────────────
# corpCode ZIP 캐시 & 정규화
# ────────────────────────────────────────────────────────────────────────────────

_CORP_CACHE: Dict[str, Any] = {"ts": 0.0, "rows": []}
_CORP_TTL_SEC = 24 * 3600

def _normalize_name(s: str) -> str:
    """공백/기호/㈜/주식회사 제거 + 소문자."""
    s = s or ""
    s = s.replace("주식회사", "")
    s = re.sub(r"[^\w가-힣]", "", s)
    return s.lower()

async def _load_corp_index() -> List[Dict[str, str]]:
    """24시간 캐시된 corpCode 목록 반환."""
    now = time.time()
    if _CORP_CACHE["rows"] and (now - _CORP_CACHE["ts"] < _CORP_TTL_SEC):
        return _CORP_CACHE["rows"]
    r = await _get(f"{_BASE}/corpCode.xml", {})
    z = zipfile.ZipFile(io.BytesIO(r.content))
    xml_bytes = z.read(z.namelist()[0])
    try:
        xml = xml_bytes.decode("utf-8")
    except UnicodeDecodeError:
        xml = xml_bytes.decode("cp949")
    data = xmltodict.parse(xml)["result"]["list"]
    _CORP_CACHE["rows"] = data
    _CORP_CACHE["ts"] = now
    return data

def _iter_match_companies(rows: Iterable[Dict[str, str]], query: str) -> List[Dict[str, str]]:
    """query(회사명/티커/코드)로 후보 매칭 후 간단 정렬."""
    q = _normalize_name(query)
    out: List[Dict[str, str]] = []

    # 6자리 숫자 → stock_code
    if q.isdigit() and len(q) == 6:
        for it in rows:
            if (it.get("stock_code") or "") == q:
                out.append({"corp_code": it["corp_code"], "corp_name": it["corp_name"], "stock_code": it.get("stock_code")})
        return out

    # 8~10자리 숫자 → corp_code
    if q.isdigit() and len(q) in (8, 10):
        for it in rows:
            if it.get("corp_code") == q:
                out.append({"corp_code": it["corp_code"], "corp_name": it["corp_name"], "stock_code": it.get("stock_code")})
        return out

    # 이름(정확→부분)
    exact, part = [], []
    for it in rows:
        nm = _normalize_name(it["corp_name"])
        if nm == q:
            exact.append(it)
        elif q and q in nm:
            part.append(it)

    src = exact or part
    for it in src[:20]:
        out.append({"corp_code": it["corp_code"], "corp_name": it["corp_name"], "stock_code": it.get("stock_code")})
    return out

# ────────────────────────────────────────────────────────────────────────────────
# 공개 함수 (API 래퍼)
# ────────────────────────────────────────────────────────────────────────────────

async def search_company(query: str) -> List[Dict[str, str]]:
    """
    기업명/티커/코드로 corp_code 후보 조회 (최대 20개)
    - 로컬 corpCode 캐시(24h) 사용
    - 정규화: 공백/기호/㈜/주식회사 제거, 소문자
    반환: [{"corp_code": "...", "corp_name": "...", "stock_code": "005930"}, ...]
    """
    rows = await _load_corp_index()
    return _iter_match_companies(rows, query)

async def list_filings(corp_code: str, start: str, end: str, page: int = 1, count: int = 20) -> Dict[str, Any]:
    """
    공시목록 조회 (YYYYMMDD ~ YYYYMMDD)
    """
    params = {"corp_code": corp_code, "bgn_de": start, "end_de": end, "page_no": page, "page_count": count}
    r = await _get(f"{_BASE}/list.json", params)
    return r.json()

async def get_financials(corp_code: str, year: int, report: str = "FY", fs_div: str = "CFS") -> List[Dict[str, Any]]:
    """
    단일회사 전체 재무제표(fnlttSinglAcntAll) 반환
    - report ∈ {Q1,H1,Q3,FY} → reprt_code {11013,11012,11014,11011}
    - fs_div ∈ {CFS,OFS}
    반환: DART JSON(list) 그대로
    """
    reprt_map = {"Q1": "11013", "H1": "11012", "Q3": "11014", "FY": "11011"}
    params = {"corp_code": corp_code, "bsns_year": str(year), "reprt_code": reprt_map[report], "fs_div": fs_div}
    r = await _get(f"{_BASE}/fnlttSinglAcntAll.json", params)
    return r.json().get("list", []) or []

# ────────────────────────────────────────────────────────────────────────────────
# 파싱/지표 계산 유틸
# ────────────────────────────────────────────────────────────────────────────────

_ALIAS: Dict[str, List[str]] = {
    "sales":  ["매출액", "수익(매출액)"],
    "cogs":   ["매출원가"],
    "op":     ["영업이익"],
    "ni":     ["당기순이익"],
    "assets": ["자산총계"],
    "equity": ["자본총계"],
    "liab":   ["부채총계"],
    "ca":     ["유동자산"],
    "cl":     ["유동부채"],
}

def _to_float(x: Any) -> Optional[float]:
    try:
        return float(str(x).replace(",", ""))
    except Exception:
        return None

def _pick(fin: List[Dict[str, Any]], names: List[str]) -> Optional[float]:
    for nm in names:
        for it in fin:
            if it.get("account_nm") == nm:
                v = _to_float(it.get("thstrm_amount"))
                if v is not None:
                    return v
    return None

def compute_basic_ratios(financials: List[Dict[str, Any]]) -> Dict[str, Optional[float]]:
    """
    DART 항목(thstrm_amount)로 기본 재무비율 계산 (단위 통일 X, 원자료 기준)
    """
    sales  = _pick(financials, _ALIAS["sales"])
    cogs   = _pick(financials, _ALIAS["cogs"])
    op     = _pick(financials, _ALIAS["op"])
    ni     = _pick(financials, _ALIAS["ni"])
    assets = _pick(financials, _ALIAS["assets"])
    equity = _pick(financials, _ALIAS["equity"])
    liab   = _pick(financials, _ALIAS["liab"])
    ca     = _pick(financials, _ALIAS["ca"])
    cl     = _pick(financials, _ALIAS["cl"])

    return {
        "gross_margin":    None if not (sales and cogs and sales != 0) else (sales - cogs)/sales,
        "oper_margin":     None if not (sales and op   and sales != 0) else op/sales,
        "net_margin":      None if not (sales and ni   and sales != 0) else ni/sales,
        "roe":             None if not (equity and ni and equity != 0) else ni/equity,
        "roa":             None if not (assets and ni and assets != 0) else ni/assets,
        "debt_to_equity":  None if not (equity and liab and equity != 0) else liab/equity,
        "current_ratio":   None if not (cl and ca and cl != 0) else ca/cl,
    }

# ────────────────────────────────────────────────────────────────────────────────
# 재무 조회 핵심(연도 선택/최신본 선택/폴백)
# ────────────────────────────────────────────────────────────────────────────────

async def _find_latest_fy_rcept(corp_code: str, year: int) -> Optional[str]:
    """해당 연도의 FY(11011) 중 최신 rcept_no 반환."""
    js = (await _get(f"{_BASE}/list.json", {
        "corp_code": corp_code, "bgn_de": f"{year}0101", "end_de": f"{year}1231",
        "page_no": 1, "page_count": 100
    })).json()
    items = [it for it in js.get("list", []) or [] if it.get("reprt_code") == "11011"]
    if not items:
        return None
    items.sort(key=lambda x: x.get("rcept_no", ""), reverse=True)
    return items[0].get("rcept_no")

async def _best_for_year(corp_code: str, year: int, prefer_annual_only: bool = True) -> Tuple[Optional[str], Optional[str], List[Dict[str, Any]]]:
    """
    연도별 최적 데이터 선택:
    1) FY CFS → 2) FY OFS → (옵션) 3) Q3 CFS
    반환: (reprt_code, fs_div, financials_list)
    """
    async def call(rep_code: str, fs_div: str) -> Tuple[str, str, List[Dict[str, Any]]]:
        js = (await _get(f"{_BASE}/fnlttSinglAcntAll.json", {
            "corp_code": corp_code, "bsns_year": str(year),
            "reprt_code": rep_code, "fs_div": fs_div
        })).json()
        fin = js.get("list") or []
        return (rep_code, fs_div, fin)

    # 1) FY 병렬
    r1, r2 = await asyncio.gather(call("11011","CFS"), call("11011","OFS"))
    for rep_code, fs_div, fin in (r1, r2):
        if fin:
            return rep_code, fs_div, fin
    # 2) FY가 없고 폴백 허용이면 Q3(CFS)
    if not prefer_annual_only:
        rep_code, fs_div, fin = await call("11014", "CFS")
        if fin:
            return rep_code, fs_div, fin
    return None, None, []

def _last_full_fy_year() -> int:
    """
    '완료 회계연도' 기준:
    - 한국 상장사는 통상 12월 결산 → FY(11011)는 다음 해 3~4월 확정
    - 오늘 기준 '올해-1'을 완료 연도로 본다.
    """
    return date.today().year - 1

# ────────────────────────────────────────────────────────────────────────────────
# 통합 조회: fetch_and_analyze_financials
# ────────────────────────────────────────────────────────────────────────────────

async def fetch_and_analyze_financials(
    query_or_corp: str,
    want_years: Optional[int] = None,
    prefer_annual_only: bool = True,
) -> Dict[str, Any]:
    """
    회사/티커/코드 입력 → 최근 N개 '완료 회계연도' 재무 요약 표준 응답.
    - want_years가 None이면 기본 3년을 사용(used_default_years=True로 표시).
      (상위 레이어에서 먼저 기간을 물어보는 것을 권장)
    - prefer_annual_only=True이면 FY만 사용, False면 FY 없을 때 Q3로 폴백.

    반환 예:
    {"status":"OK","corp_code":"00126380","corp_name":"삼성전자",
     "years":[{...},...], "used_default_years":true/false}

    실패/부족:
      - {"status":"NO_MATCH","reason":"..."}
      - {"status":"NEED_INFO","fields":["corp_name"],"reason":"동명이의","candidates":[...]}
      - {"status":"NO_FINANCIALS","reason":"...","corp_code":"..."}
      - {"status":"RATE_LIMIT"} / {"status":"DART_DOWN"}
    """
    # 0) 회사 식별
    rows = await _load_corp_index()
    cands = _iter_match_companies(rows, query_or_corp)
    if not cands:
        return {"status": "NO_MATCH", "reason": f"회사 '{query_or_corp}'를 corpCode에서 찾지 못했습니다."}
    if len(cands) > 1:
        return {
            "status": "NEED_INFO",
            "fields": ["corp_name"],
            "reason": f"후보 {len(cands)}개, 회사명을 더 구체화해 주세요.",
            "candidates": cands[:10],
        }

    corp_code = cands[0]["corp_code"]
    corp_name = cands[0]["corp_name"]

    # 1) 기간 확정
    used_default_years = False
    if want_years is None:
        want_years = 3
        used_default_years = True

    # 2) 연도 목록(여유 2년 추가 스캔)
    last_full = _last_full_fy_year()
    scan_years = list(range(last_full, last_full - (want_years + 2), -1))

    # 3) 연도별 조회/요약
    rows_out: List[Dict[str, Any]] = []
    try:
        for y in scan_years:
            rep_code, fs_div, fin = await _best_for_year(corp_code, y, prefer_annual_only=prefer_annual_only)
            if not fin:
                continue

            sales  = _pick(fin, _ALIAS["sales"])
            cogs   = _pick(fin, _ALIAS["cogs"])
            op     = _pick(fin, _ALIAS["op"])
            ni     = _pick(fin, _ALIAS["ni"])
            assets = _pick(fin, _ALIAS["assets"])
            equity = _pick(fin, _ALIAS["equity"])
            liab   = _pick(fin, _ALIAS["liab"])
            ca     = _pick(fin, _ALIAS["ca"])
            cl     = _pick(fin, _ALIAS["cl"])

            ratios = {
                "gross_margin":   None if not (sales and cogs and sales != 0) else (sales - cogs)/sales,
                "oper_margin":    None if not (sales and op   and sales != 0) else op/sales,
                "net_margin":     None if not (sales and ni   and sales != 0) else ni/sales,
                "roe":            None if not (equity and ni and equity != 0) else ni/equity,
                "roa":            None if not (assets and ni and assets != 0) else ni/assets,
                "debt_to_equity": None if not (equity and liab and equity != 0) else liab/equity,
                "current_ratio":  None if not (cl and ca and cl != 0) else ca/cl,
            }

            rcept = await _find_latest_fy_rcept(corp_code, y) if rep_code == "11011" else None
            rows_out.append({
                "year": y,
                "sales": sales, "op": op, "ni": ni,
                "assets": assets, "equity": equity, "liab": liab,
                "current_assets": ca, "current_liab": cl,
                "ratios": ratios,
                "reprt_code": rep_code, "fs_div": fs_div,
                "rcept_no": rcept,
                "row_count": len(fin),
            })

            if len(rows_out) >= want_years:
                break
    except RuntimeError as e:
        msg = str(e)
        if msg == "RATE_LIMIT":
            return {"status": "RATE_LIMIT"}
        return {"status": "DART_DOWN"}

    if not rows_out:
        return {"status": "NO_FINANCIALS", "reason": "완료 회계연도 기준 FY/Q3에서 재무표를 확인하지 못했습니다.", "corp_code": corp_code}

    rows_out.sort(key=lambda x: x["year"])
    return {
        "status": "OK",
        "corp_code": corp_code,
        "corp_name": corp_name,
        "years": rows_out,
        "used_default_years": used_default_years,
    }


def get_tools():
    tools = []
    tools.append(search_company)
    tools.append(list_filings)
    tools.append(get_financials)
    tools.append(compute_basic_ratios)
    tools.append(fetch_and_analyze_financials)
    return tools