# Shifting Temperatures (DSC 106 Project 3, team DSC106 Club)

Interactive D3 map of CMIP6 (CESM2) temperature change, 1850–2100, under low and high emissions.

- `index.html`, `main.js`, `style.css`: the visualization (static, GitHub Pages ready)
- `data/temps.json`: processed data the page loads
- `scripts/prepare_data.py`: downloads CMIP6 from Google Cloud and builds `data/temps.json`
- `scripts/exploratory.py`: the six exploratory graphs in `figures/`

```
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/prepare_data.py
.venv/bin/python scripts/exploratory.py
python3 -m http.server   # open http://localhost:8000
```
