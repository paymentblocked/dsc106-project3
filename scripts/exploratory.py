"""Six exploratory graphs that led to our question. Run prepare_data.py first.
Saves PNGs to figures/."""
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data" / "cache"
FIG = ROOT / "figures"
FIG.mkdir(exist_ok=True)

hist = xr.open_dataarray(CACHE / "historical.nc")
ssp126 = xr.open_dataarray(CACHE / "ssp126.nc")
ssp585 = xr.open_dataarray(CACHE / "ssp585.nc")
base = hist.sel(year=slice(1850, 1900)).mean("year")
LOW, HIGH = "#2b7bba", "#c0392b"
plt.rcParams.update({"figure.dpi": 150, "axes.spines.top": False, "axes.spines.right": False})


def gmean(da):
    return da.weighted(np.cos(np.deg2rad(da.lat))).mean(("lat", "lon"))


def save(fig, name):
    fig.tight_layout()
    fig.savefig(FIG / name, bbox_inches="tight")
    plt.close(fig)
    print("saved", name)


g_base = float(gmean(base))
g_hist = gmean(hist) - g_base
g_126 = gmean(ssp126) - g_base
g_585 = gmean(ssp585) - g_base

# 1. Global mean, historical only
fig, ax = plt.subplots(figsize=(9, 4))
ax.plot(g_hist.year, g_hist, color="0.6", lw=1, label="annual")
ax.plot(g_hist.year, g_hist.rolling(year=10, center=True).mean(), color="k", lw=2, label="10-year rolling mean")
ax.axhline(0, color="0.8", lw=0.8)
ax.set(title="1. Global mean surface air temperature, 1850–2014 (CESM2 historical)",
       xlabel="Year", ylabel="Change vs 1850–1900 (°C)")
ax.legend(frameon=False)
save(fig, "1_global_historical.png")

# 2. San Diego (nearest grid cell), same example as the course notebook
sd = lambda da: da.sel(lat=32.7157, lon=-117.1611, method="nearest")
sd_base = float(sd(base))
fig, ax = plt.subplots(figsize=(9, 4))
ax.plot(sd(hist).year, sd(hist) - sd_base, color="0.6", lw=1, label="annual")
ax.plot(sd(hist).year, (sd(hist) - sd_base).rolling(year=10, center=True).mean(), color="k", lw=2,
        label="10-year rolling mean")
ax.axhline(0, color="0.8", lw=0.8)
ax.set(title="2. San Diego grid cell temperature, 1850–2014", xlabel="Year", ylabel="Change vs 1850–1900 (°C)")
ax.legend(frameon=False)
save(fig, "2_san_diego.png")

# 3. Baseline map (absolute temperature)
fig, ax = plt.subplots(figsize=(9, 4.5))
m = ax.pcolormesh(base.lon, base.lat, base, cmap="viridis", shading="auto")
fig.colorbar(m, ax=ax, label="°C", shrink=0.8)
ax.set(title="3. Baseline: mean surface air temperature, 1850–1900", xlabel="Longitude", ylabel="Latitude")
ax.set_aspect("equal")
save(fig, "3_baseline_map.png")

# 4. Global mean projections by scenario
fig, ax = plt.subplots(figsize=(9, 4))
ax.plot(g_hist.year, g_hist, color="k", lw=1.5, label="historical")
ax.plot(g_126.year, g_126, color=LOW, lw=1.5, label="SSP1-2.6 (low emissions)")
ax.plot(g_585.year, g_585, color=HIGH, lw=1.5, label="SSP5-8.5 (high emissions)")
ax.axhline(0, color="0.8", lw=0.8)
ax.axvline(2015, color="0.8", lw=0.8, ls="--")
ax.set(title="4. Global mean temperature change under two emissions paths", xlabel="Year",
       ylabel="Change vs 1850–1900 (°C)")
ax.legend(frameon=False)
save(fig, "4_global_scenarios.png")

# 5. Map of end-of-century warming, high emissions
warm585 = ssp585.sel(year=slice(2081, 2100)).mean("year") - base
fig, ax = plt.subplots(figsize=(9, 4.5))
m = ax.pcolormesh(warm585.lon, warm585.lat, warm585, cmap="Reds", vmin=0, shading="auto")
fig.colorbar(m, ax=ax, label="°C warmer than 1850–1900", shrink=0.8)
ax.set(title="5. Warming by 2081–2100 under SSP5-8.5", xlabel="Longitude", ylabel="Latitude")
ax.set_aspect("equal")
save(fig, "5_warming_map_ssp585.png")

# 6. Warming by latitude, both scenarios (zonal mean)
warm126 = ssp126.sel(year=slice(2081, 2100)).mean("year") - base
fig, ax = plt.subplots(figsize=(9, 4))
ax.plot(warm126.lat, warm126.mean("lon"), color=LOW, lw=2, label="SSP1-2.6")
ax.plot(warm585.lat, warm585.mean("lon"), color=HIGH, lw=2, label="SSP5-8.5")
ax.set(title="6. Warming by latitude, 2081–2100 vs 1850–1900", xlabel="Latitude (°S ← → °N)",
       ylabel="Zonal mean warming (°C)", xlim=(-90, 90))
ax.legend(frameon=False)
save(fig, "6_warming_by_latitude.png")
