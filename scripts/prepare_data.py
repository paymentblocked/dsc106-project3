"""Download CESM2 surface air temperature (tas) from the public CMIP6 bucket on
Google Cloud and turn it into the files our figures and D3 page use.

Same access pattern as the course notebook (pandas catalog -> gcsfs -> xarray/zarr).
Store paths come from this catalog query:
    df = pd.read_csv('https://storage.googleapis.com/cmip6/cmip6-zarr-consolidated-stores.csv')
    df.query("source_id=='CESM2' & table_id=='Amon' & variable_id=='tas' & member_id=='r4i1p1f1'")

Outputs
    data/cache/{historical,ssp126,ssp585}.nc   annual means on the native grid (git-ignored)
    data/temps.json                            5-degree grid anomalies for the D3 page
"""
import json
from pathlib import Path

import gcsfs
import numpy as np
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data" / "cache"
CACHE.mkdir(parents=True, exist_ok=True)

STORES = {
    "historical": "gs://cmip6/CMIP6/CMIP/NCAR/CESM2/historical/r4i1p1f1/Amon/tas/gn/v20190308/",
    "ssp126": "gs://cmip6/CMIP6/ScenarioMIP/NCAR/CESM2/ssp126/r4i1p1f1/Amon/tas/gn/v20200528/",
    "ssp585": "gs://cmip6/CMIP6/ScenarioMIP/NCAR/CESM2/ssp585/r4i1p1f1/Amon/tas/gn/v20200528/",
}
BASELINE = slice(1850, 1900)
CELL = 5  # degrees


def annual_means(name):
    """Monthly tas (K) -> annual mean tas (degC) on the native ~1 degree grid, cached."""
    path = CACHE / f"{name}.nc"
    if path.exists():
        return xr.open_dataarray(path)
    gcs = gcsfs.GCSFileSystem(token="anon")
    ds = xr.open_zarr(gcs.get_mapper(STORES[name]), consolidated=True)
    tas = ds.tas.groupby("time.year").mean("time") - 273.15
    # CESM2 longitudes run 0..360; shift to -180..180 so maps read normally
    tas = tas.assign_coords(lon=((tas.lon + 180) % 360) - 180).sortby("lon")
    tas = tas.drop_vars([c for c in tas.coords if c not in ("year", "lat", "lon")])
    tas.name = "tas"
    tas.load().to_netcdf(path)
    print(f"cached {name}: {tas.sizes}")
    return tas


def coarsen(tas):
    """Area-weighted (cos lat) average of the native grid into 5x5 degree cells.
    Returns array (year, 36 lat cells, 72 lon cells)."""
    lat_bin = np.clip(((tas.lat.values + 90) // CELL).astype(int), 0, 180 // CELL - 1)
    lon_bin = np.clip(((tas.lon.values + 180) // CELL).astype(int), 0, 360 // CELL - 1)
    w = np.cos(np.deg2rad(tas.lat.values))[:, None] * np.ones(tas.sizes["lon"])
    cell_id = (lat_bin[:, None] * (360 // CELL) + lon_bin[None, :]).ravel()
    n_cells = (180 // CELL) * (360 // CELL)
    wsum = np.bincount(cell_id, weights=w.ravel(), minlength=n_cells)
    vals = tas.values.reshape(tas.sizes["year"], -1)
    out = np.stack([np.bincount(cell_id, weights=(v * w.ravel()), minlength=n_cells) / wsum for v in vals])
    return out.reshape(-1, 180 // CELL, 360 // CELL)


def global_mean(tas):
    w = np.cos(np.deg2rad(tas.lat))
    return tas.weighted(w).mean(("lat", "lon"))


def main():
    runs = {name: annual_means(name) for name in STORES}
    hist = runs["historical"]
    base_native = hist.sel(year=BASELINE).mean("year")
    base_global = float(global_mean(base_native))

    grids = {name: coarsen(da) for name, da in runs.items()}
    base_grid = grids["historical"][(hist.year >= 1850) & (hist.year <= 1900)].mean(axis=0)

    def anomalies(name):
        # stored as tenths of a degree (ints) to keep the JSON small
        return np.round((grids[name] - base_grid) * 10).astype(int).reshape(len(runs[name].year), -1).tolist()

    def gmean(name):
        return np.round(global_mean(runs[name]).values - base_global, 2).tolist()

    out = {
        "model": "CESM2 r4i1p1f1 (NCAR), CMIP6 Amon tas",
        "baseline": "1850-1900 mean",
        "units": "anomaly in tenths of degC",
        "cell": CELL,
        "lats": list(range(-90, 90, CELL)),   # south edge of each cell row
        "lons": list(range(-180, 180, CELL)),  # west edge of each cell column
        "baseline_temp": np.round(base_grid, 1).ravel().tolist(),
        "years": {k: runs[k].year.values.tolist() for k in runs},
        "anom": {k: anomalies(k) for k in runs},
        "global": {k: gmean(k) for k in runs},
    }
    dest = ROOT / "data" / "temps.json"
    dest.write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote {dest} ({dest.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
