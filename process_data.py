"""
Procesa los archivos Excel de incidencias de La Molina y genera incidents.json.
Incluye geocodificación de las top-N direcciones vía Nominatim (con caché persistente).
"""
import pandas as pd
import json
import os
import re
import time
import urllib.request
import urllib.parse
from datetime import datetime
from collections import Counter

os.chdir(os.path.dirname(os.path.abspath(__file__)))

DAYS_ES = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']
TIME_SLOTS = ['08-14', '14-20', '20-02', '02-08']
ROMAN = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6}
GEOCODE_CACHE_FILE = 'geocode_cache.json'
GEOCODE_TOP_N = 350      # direcciones más frecuentes a geocodificar
GEOCODE_RATE_SEC = 1.1   # Nominatim TOS: max 1 req/seg

SKIP_WORDS = [
    'VIRTUAL', 'ONLINE', 'TELEF', 'CELULAR', 'LLAMADA', 'FACEBOOK',
    'WHATSAPP', 'INSTAGRAM', 'CORREO', 'EMAIL', 'REDES SOCIALES',
    'NAN', 'DESCONOCIDO',
]

# Bounding box aproximado de La Molina y distritos limítrofes
LIMA_LAT_MIN, LIMA_LAT_MAX = -12.18, -11.95
LIMA_LNG_MIN, LIMA_LNG_MAX = -77.10, -76.80


# ─── helpers ──────────────────────────────────────────────────────────────────

def safe_int(val):
    try:
        v = int(val)
        return v if v > 0 else 0
    except Exception:
        return 0

def safe_sector(val):
    if pd.isna(val):
        return None
    try:
        return int(float(val))
    except Exception:
        return None

def hour_to_slot(hour):
    if 8 <= hour < 14:   return '08-14'
    elif 14 <= hour < 20: return '14-20'
    elif 20 <= hour or hour < 2: return '20-02'
    else: return '02-08'

def normalize_modalidad(m):
    if pd.isna(m):
        return 'DESCONOCIDO'
    m = str(m).strip().upper()
    return re.sub(r'\s+', ' ', m)

def normalize_address(addr):
    """Debe coincidir exactamente con la función JS en MapView."""
    addr = re.sub(r'[^\w\s.,áéíóúüñÁÉÍÓÚÜÑ]', ' ', str(addr), flags=re.IGNORECASE)
    addr = re.sub(r'\s+', ' ', addr).strip().upper()
    return addr[:120]

def parse_datetime_flexible(val):
    if pd.isna(val):
        return None
    if isinstance(val, datetime):
        return val
    if hasattr(val, 'to_pydatetime'):
        return val.to_pydatetime()
    s = str(val).strip()
    s = s.replace('A.M.', 'AM').replace('P.M.', 'PM')
    for fmt in ['%d/%m/%Y %I:%M:%S %p', '%d/%m/%Y %I:%M:%S%p',
                '%d/%m/%Y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S']:
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            pass
    try:
        return pd.to_datetime(s, dayfirst=True).to_pydatetime()
    except Exception:
        return None

def roman_to_int(s):
    for roman, val in ROMAN.items():
        if s.strip() == roman:
            return val
    return None


# ─── geocoding ────────────────────────────────────────────────────────────────

def load_geocache():
    if os.path.exists(GEOCODE_CACHE_FILE):
        with open(GEOCODE_CACHE_FILE, encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_geocache(cache):
    with open(GEOCODE_CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, separators=(',', ':'))

def is_physical_address(addr):
    upper = addr.upper()
    return not any(w in upper for w in SKIP_WORDS) and len(addr.strip()) > 5

def in_lima_bbox(lat, lng):
    return LIMA_LAT_MIN <= lat <= LIMA_LAT_MAX and LIMA_LNG_MIN <= lng <= LIMA_LNG_MAX

def clean_address(addr):
    """Limpia la dirección removiendo ruido y normalizando."""
    # Eliminar artefactos de encoding (Latin-1 sobre UTF-8)
    addr = addr.encode('ascii', errors='ignore').decode('ascii')
    # Ruido que confunde a Nominatim
    noise = [
        r'DISTRITO\s+DE\s+LA\s+MOLINA', r'LIMA\s+\d{5}', r',?\s*PERU?\b',
        r'\bMZ\.?\s+[A-Z0-9]+\b', r'\bLT\.?\s+\d+\b', r'\bLOTE\.?\s+\d+\b',
        r'\bDPTO\.?\s+[\w\d]+', r'\bINT\.?\s+[\w\d]+', r'\bPISO\s+\d+',
        r'CUADRA\s+\d+', r'CDRA\.?\s+\d+', r'CDR\.\s+\d+',
        r'REFERENCIA[:\s].*$', r'REF\..*$', r'\(\s*[^)]*\)',
    ]
    for pat in noise:
        addr = re.sub(pat, ' ', addr, flags=re.IGNORECASE)
    # Intersecciones: CON / Y → &
    addr = re.sub(r'\s+(?:CON|Y)\s+(?=AV|JR|JIR|CALL|PSJE|CALLE)',
                  ' & ', addr, flags=re.IGNORECASE)
    return re.sub(r'\s+', ' ', addr).strip(' ,.')

def nominatim_query(query):
    url = (
        'https://nominatim.openstreetmap.org/search?format=json&limit=1'
        f'&q={urllib.parse.quote(query)}&countrycodes=pe'
    )
    req = urllib.request.Request(url, headers={
        'User-Agent': 'LaMolinaDashboard/1.0 (research)',
        'Accept-Language': 'es,en',
    })
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read())
        if data:
            lat, lng = float(data[0]['lat']), float(data[0]['lon'])
            if in_lima_bbox(lat, lng):
                return {'lat': lat, 'lng': lng}
    except Exception as e:
        print(f'      [err] {e}')
    return None

def geocode_one(address):
    """Intenta geocodificar con múltiples variantes de la dirección."""
    cleaned = clean_address(address)

    candidates = []
    # Variante 1: dirección limpia + La Molina
    if cleaned:
        candidates.append(f"{cleaned}, La Molina, Lima, Peru")
    # Variante 2: si es intersección (tiene &), tomar primer tramo
    if '&' in cleaned:
        first = cleaned.split('&')[0].strip().rstrip(',')
        if len(first) > 6:
            candidates.append(f"{first}, La Molina, Lima, Peru")
    # Variante 3: quitar números de la dirección limpia
    no_nums = re.sub(r'\b\d+\b', '', cleaned).strip(' ,')
    if no_nums and no_nums != cleaned and len(no_nums) > 8:
        candidates.append(f"{no_nums}, La Molina, Lima, Peru")
    # Variante 4: dirección original sin procesar
    orig_clean = re.sub(r'[\x80-\xff]', '', address).strip()
    if orig_clean and orig_clean not in candidates:
        candidates.append(f"{orig_clean}, La Molina, Lima")

    for i, q in enumerate(candidates):
        if i > 0:
            time.sleep(GEOCODE_RATE_SEC)  # rate-limit entre variantes
        result = nominatim_query(q)
        if result:
            return result
    return None

def geocode_addresses(addr_counts, cache):
    """Geocodifica las top-N direcciones físicas usando caché persistente."""
    candidates = [
        (addr, cnt) for addr, cnt in addr_counts.most_common()
        if is_physical_address(addr)
    ][:GEOCODE_TOP_N]

    to_fetch = [(addr, cnt) for addr, cnt in candidates
                if normalize_address(addr) not in cache]

    print(f'\nGeocodificacion: {len(candidates)} direcciones top, '
          f'{len(to_fetch)} nuevas a consultar, {len(candidates)-len(to_fetch)} en cache.')
    if to_fetch:
        print(f'   Tiempo estimado: ~{len(to_fetch)*GEOCODE_RATE_SEC/60:.1f} min (puede ser mas con variantes)')

    for i, (addr, cnt) in enumerate(to_fetch, 1):
        key = normalize_address(addr)
        result = geocode_one(addr)
        cache[key] = result
        status = f'OK ({result["lat"]:.4f}, {result["lng"]:.4f})' if result else 'NO ENCONTRADO'
        print(f'   [{i}/{len(to_fetch)}] {cnt} casos | {addr[:52]} -> {status}')
        save_geocache(cache)
        time.sleep(GEOCODE_RATE_SEC)

    # Mapa final (solo coords válidas)
    result_map = {}
    for addr, _ in candidates:
        key = normalize_address(addr)
        if cache.get(key):
            result_map[key] = cache[key]

    found = len(result_map)
    total = len(candidates)
    print(f'\nGeocodeadas: {found}/{total} ({found/total*100:.0f}%)')
    return result_map


# ─── parsers por año ──────────────────────────────────────────────────────────

def _inc(dt, year_default, modalidad, delito, direccion, sector, subsector, **items):
    hour = dt.hour if dt else None
    return {
        'year': dt.year if dt else year_default,
        'month': dt.month if dt else None,
        'day': dt.day if dt else None,
        'hour': hour,
        'day_of_week': dt.weekday() if dt else None,
        'time_slot': hour_to_slot(hour) if hour is not None else None,
        'delito': delito,
        'modalidad': modalidad,
        'direccion': direccion,
        'sector': sector,
        'subsector': subsector,
        **items,
    }

def process_2025():
    df = pd.read_excel('INCIDENCIAS   2025-2024-2023.xlsx',
                       sheet_name='INCIDENCIA  2025', header=1)
    df = df[df['N.REG'].notna() & (df['N.REG'] != 'N.REG')].copy()
    rows = []
    for _, row in df.iterrows():
        dt = parse_datetime_flexible(row.get('FEC/HECHO.'))
        if dt is None or dt.year < 2018:
            continue
        sub = str(row.get('Unnamed: 7', '')).strip()
        rows.append(_inc(
            dt, 2025,
            normalize_modalidad(row.get('MODALIDAD')),
            str(row.get('DELITO', '')).strip(),
            str(row.get('DIRECCION ', '')).strip(),
            safe_sector(row.get(' SECTORES ')),
            sub if sub not in ('nan', '') else None,
            celular=safe_int(row.get('  CELULAR ')),
            cartera=safe_int(row.get('CARTERA ')),
            billetera=safe_int(row.get('BILLETERAS ')),
            auto=safe_int(row.get('AUTOS')),
            dinero=safe_int(row.get('DINERO ')),
            diversos=safe_int(row.get(' DIVERSOS')),
        ))
    print(f'2025: {len(rows)} incidencias')
    return rows

def process_2024():
    df = pd.read_excel('INCIDENCIAS   2025-2024-2023.xlsx',
                       sheet_name='INCIDENCIA   2024', header=None)
    df = df.iloc[3:].copy()
    df.columns = range(len(df.columns))
    rows = []
    for _, row in df.iterrows():
        n = row.get(4)
        if pd.isna(n) or str(n).strip() in ('', 'N.REG', 'N°'):
            continue
        dt = parse_datetime_flexible(row.get(6))
        if dt is None or dt.year < 2018:
            continue
        sub = str(row.get(11, '')).strip()
        rows.append(_inc(
            dt, 2024,
            normalize_modalidad(row.get(8)),
            str(row.get(7, '')).strip(),
            str(row.get(9, '')).strip(),
            safe_sector(row.get(10)),
            sub if sub not in ('nan', '') else None,
            celular=safe_int(row.get(12)), cartera=safe_int(row.get(13)),
            billetera=safe_int(row.get(14)), auto=safe_int(row.get(15)),
            dinero=safe_int(row.get(16)), diversos=safe_int(row.get(17)),
        ))
    print(f'2024: {len(rows)} incidencias')
    return rows

def process_2023():
    df = pd.read_excel('INCIDENCIAS   2025-2024-2023.xlsx',
                       sheet_name='INCIDENCIA 2023', header=None)
    df = df.iloc[3:].copy()
    df.columns = range(len(df.columns))
    rows = []
    for _, row in df.iterrows():
        n = row.get(3)
        if pd.isna(n) or str(n).strip() in ('', 'N.REG'):
            continue
        dt = parse_datetime_flexible(row.get(5))
        if dt is None or dt.year < 2018:
            continue
        sub = str(row.get(10, '')).strip()
        rows.append(_inc(
            dt, 2023,
            normalize_modalidad(row.get(7)),
            str(row.get(6, '')).strip(),
            str(row.get(8, '')).strip(),
            safe_sector(row.get(9)),
            sub if sub not in ('nan', '') else None,
            celular=safe_int(row.get(11)), cartera=safe_int(row.get(12)),
            billetera=safe_int(row.get(13)), auto=safe_int(row.get(14)),
            dinero=safe_int(row.get(15)), diversos=safe_int(row.get(16)),
        ))
    print(f'2023: {len(rows)} incidencias')
    return rows

def process_2026():
    df = pd.read_excel('INCIDENCIAS 2026.xlsx', sheet_name='PUNTOS', header=None)
    rows = []
    current_month = current_sector = current_subsector = None
    MONTH_MAP = {
        'ENERO':1,'FEBRERO':2,'MARZO':3,'ABRIL':4,'MAYO':5,'JUNIO':6,
        'JULIO':7,'AGOSTO':8,'SEPTIEMBRE':9,'OCTUBRE':10,'NOVIEMBRE':11,'DICIEMBRE':12,
    }
    for _, row in df.iterrows():
        col0 = row.get(0)
        col1 = str(row.get(1, '')).strip().upper() if pd.notna(row.get(1)) else ''
        if pd.isna(col0):
            for mes, num in MONTH_MAP.items():
                if mes in col1:
                    current_month = num
                    break
            if 'SECTOR' in col1 and 'SUB' in col1:
                m = re.search(r'SECTOR\s+(I{1,3}V?|VI?)\s*/\s*SUB\s+SECTOR\s+([A-Z])', col1)
                if m:
                    current_sector = roman_to_int(m.group(1))
                    current_subsector = m.group(2)
            elif 'SECTOR' in col1:
                m = re.search(r'SECTOR\s+(I{1,3}V?|VI?)', col1)
                if m:
                    current_sector = roman_to_int(m.group(1))
            continue
        try:
            float(col0)
        except Exception:
            continue
        if current_month is None:
            continue
        dow = next((i for i, d in enumerate(range(4, 11))
                    if str(row.get(d, '')).strip().upper() == 'X'), None)
        slot_idx = next((i for i, c in enumerate(range(11, 15))
                         if str(row.get(c, '')).strip().upper() == 'X'), None)
        slot = TIME_SLOTS[slot_idx] if slot_idx is not None else None
        slot_hour = {'08-14': 10, '14-20': 17, '20-02': 22, '02-08': 4}
        rows.append({
            'year': 2026, 'month': current_month, 'day': None,
            'hour': slot_hour.get(slot) if slot else None,
            'day_of_week': dow, 'time_slot': slot,
            'delito': str(row.get(2, '')).strip(),
            'modalidad': normalize_modalidad(row.get(3)),
            'direccion': str(row.get(1, '')).strip(),
            'sector': current_sector, 'subsector': current_subsector,
            'celular': 0, 'cartera': 0, 'billetera': 0,
            'auto': 0, 'dinero': 0, 'diversos': 0,
        })
    print(f'2026: {len(rows)} incidencias')
    return rows


# ─── main ─────────────────────────────────────────────────────────────────────

def main():
    all_incidents = []
    all_incidents.extend(process_2023())
    all_incidents.extend(process_2024())
    all_incidents.extend(process_2025())
    all_incidents.extend(process_2026())

    all_incidents = [i for i in all_incidents if i['year'] in (2022, 2023, 2024, 2025, 2026)]
    for idx, inc in enumerate(all_incidents):
        inc['id'] = idx

    modalidad_counts = Counter(i['modalidad'] for i in all_incidents)
    top_modalidades = [m for m, _ in modalidad_counts.most_common(25)]

    addr_counts = Counter(i['direccion'] for i in all_incidents if i['direccion'])
    top_addresses = [a for a, _ in addr_counts.most_common(500)]

    sector_counts = Counter(i['sector'] for i in all_incidents if i['sector'] is not None)
    months_2026 = [i['month'] for i in all_incidents if i['year'] == 2026 and i['month']]
    ytd_max_month = max(months_2026) if months_2026 else 5

    # Geocodificación
    geocache = load_geocache()
    geocoded_locations = geocode_addresses(addr_counts, geocache)

    output = {
        'incidents': all_incidents,
        'geocoded_locations': geocoded_locations,
        'meta': {
            'total': len(all_incidents),
            'years': [2022, 2023, 2024, 2025, 2026],
            'top_modalidades': top_modalidades,
            'top_addresses': top_addresses,
            'sectors': sorted(sector_counts.keys()),
            'ytd_max_month': ytd_max_month,
            'geocoded_count': len(geocoded_locations),
        }
    }

    os.makedirs('public/data', exist_ok=True)
    with open('public/data/incidents.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    print(f'\nTotal: {len(all_incidents)} incidencias')
    print(f'Coordenadas pre-calculadas: {len(geocoded_locations)}')
    print(f'Exportado -> public/data/incidents.json')


if __name__ == '__main__':
    main()
