"""
Actualiza data/precios.json con datos públicos reales:
- Precio spot del petróleo WTI (EIA, oficial gobierno EE.UU.)
- Índice PPI de resinas plásticas termoplásticas (FRED / BLS, oficial gobierno EE.UU.)

No hay una fuente pública gratuita que separe LDPE y HDPE como precio spot;
esa granularidad la venden proveedores comerciales (ChemAnalyst, ChemOrbis,
S&P Platts, Intratec). Por eso usamos el índice agregado de resinas
termoplásticas como referencia, más el precio del petróleo (insumo directo
de la resina) como indicador líder.

Requiere las variables de entorno EIA_API_KEY y FRED_API_KEY (gratuitas).
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "precios.json")

EIA_SERIES = "RWTC"  # Cushing, OK WTI Spot Price FOB (daily, USD/barril)
FRED_SERIES = "PCU3252113252111"  # PPI Industry: Thermoplastic Resins and Plastics Materials

MAX_POINTS_OIL = 60
MAX_POINTS_RESIN = 36


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "etp-polimer-price-bot/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_oil(api_key):
    url = (
        "https://api.eia.gov/v2/petroleum/pri/spt/data/"
        f"?api_key={api_key}&frequency=daily&data[0]=value"
        f"&facets[series][]={EIA_SERIES}"
        "&sort[0][column]=period&sort[0][direction]=desc"
        f"&offset=0&length={MAX_POINTS_OIL}"
    )
    payload = fetch_json(url)
    rows = payload.get("response", {}).get("data", [])
    series = [{"date": r["period"], "value": float(r["value"])} for r in rows if r.get("value") is not None]
    series.sort(key=lambda p: p["date"])
    return series


def fetch_resin(api_key):
    url = (
        "https://api.stlouisfed.org/fred/series/observations"
        f"?series_id={FRED_SERIES}&api_key={api_key}&file_type=json"
        f"&sort_order=desc&limit={MAX_POINTS_RESIN}"
    )
    payload = fetch_json(url)
    rows = payload.get("observations", [])
    series = [
        {"date": r["date"], "value": float(r["value"])}
        for r in rows
        if r.get("value") not in (None, ".")
    ]
    series.sort(key=lambda p: p["date"])
    return series


def main():
    eia_key = os.environ.get("EIA_API_KEY")
    fred_key = os.environ.get("FRED_API_KEY")

    if not eia_key or not fred_key:
        print("Faltan EIA_API_KEY y/o FRED_API_KEY en el entorno.", file=sys.stderr)
        sys.exit(1)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    result = {"updated": now}

    try:
        oil_series = fetch_oil(eia_key)
        result["oil"] = {
            "label": "Petróleo WTI (Cushing, OK)",
            "unit": "USD/barril",
            "source": "EIA (U.S. Energy Information Administration)",
            "source_url": "https://www.eia.gov/dnav/pet/hist/RWTCD.htm",
            "series": oil_series,
        }
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, ValueError) as e:
        print(f"Error obteniendo datos de petróleo (EIA): {e}", file=sys.stderr)

    try:
        resin_series = fetch_resin(fred_key)
        result["resin_ppi"] = {
            "label": "Índice PPI Resinas Termoplásticas (EE.UU.)",
            "unit": "Índice (Dic 1984=100)",
            "source": "FRED / U.S. Bureau of Labor Statistics",
            "source_url": "https://fred.stlouisfed.org/series/PCU3252113252111",
            "series": resin_series,
        }
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, ValueError) as e:
        print(f"Error obteniendo índice de resinas (FRED): {e}", file=sys.stderr)

    if "oil" not in result and "resin_ppi" not in result:
        print("No se pudo obtener ningún dato. Abortando sin escribir archivo.", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"OK — escrito {DATA_PATH}")


if __name__ == "__main__":
    main()
