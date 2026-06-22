"""
Actualiza data/precios.json con el índice PPI de resinas plásticas
termoplásticas (FRED / BLS, oficial gobierno EE.UU.).

El precio del petróleo WTI ya no se obtiene aquí: se muestra en vivo en
el sitio vía el widget de TradingView (TVC:USOIL), que se actualiza solo
en el navegador y no depende de este pipeline.

No hay una fuente pública gratuita que separe LDPE y HDPE como precio spot;
esa granularidad la venden proveedores comerciales (ChemAnalyst, ChemOrbis,
S&P Platts, Intratec). Por eso usamos el índice agregado de resinas
termoplásticas como referencia.

Requiere la variable de entorno FRED_API_KEY (gratuita).
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "precios.json")

FRED_SERIES = "PCU3252113252111"  # PPI Industry: Thermoplastic Resins and Plastics Materials

MAX_POINTS_RESIN = 36


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "etp-polimer-price-bot/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


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
    fred_key = os.environ.get("FRED_API_KEY")

    if not fred_key:
        print("Falta FRED_API_KEY en el entorno.", file=sys.stderr)
        sys.exit(1)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        resin_series = fetch_resin(fred_key)
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, ValueError) as e:
        print(f"Error obteniendo índice de resinas (FRED): {e}", file=sys.stderr)
        sys.exit(1)

    result = {
        "updated": now,
        "resin_ppi": {
            "label": "Índice PPI Resinas Termoplásticas (EE.UU.)",
            "unit": "Índice (Dic 1984=100)",
            "source": "FRED / U.S. Bureau of Labor Statistics",
            "source_url": "https://fred.stlouisfed.org/series/PCU3252113252111",
            "series": resin_series,
        },
    }

    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"OK — escrito {DATA_PATH}")


if __name__ == "__main__":
    main()
