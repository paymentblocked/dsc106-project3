# Checkpoint video script (target 1:50, hard limit 2:00)

**Setup:** open `figures/` in Preview (arrow keys move through the six graphs) and open the site with
`python3 -m http.server` → http://localhost:8000. Record with Cmd+Shift+5 → Options → Microphone on → Record Selected Portion.
That saves a .mov file; convert it to .mp4 with `ffmpeg -i recording.mov -c:v libx264 -c:a aac checkpoint.mp4`.

About 240 words. Read at a normal pace.

---

**[0:00–0:10] Screen: site title**
> Hi, we're DSC106 Club: Ryan Namdar, Austin Flippo, and David Li. Our project is called Shifting Temperatures.

**[0:10–0:25] Screen: graph 1**
> We're using CMIP6 climate model data. Specifically, monthly surface air temperature from NCAR's CESM2 model, for the
> historical run from 1850 to 2014 and two future scenarios: low emissions, SSP1-2.6, and high emissions, SSP5-8.5.

**[0:25–1:25] Screen: graphs 1 → 6, about 10 seconds each**
> **(1)** Global average temperature has already risen about one degree since 1850–1900.
> **(2)** Zooming into San Diego, the local trend is similar but much noisier year to year.
> **(3)** This is the 1850–1900 baseline. Raw temperature is mostly the equator-to-pole gradient, so for the final map we
> show *change* from each place's own baseline instead.
> **(4)** After 2015 the two scenarios split: by the end of the century, a bit over 2 degrees under low emissions and over 5 under high.
> **(5)** Under high emissions, warming is very uneven: parts of the Arctic warm over 15 degrees, land warms more than ocean, and the North
> Atlantic south of Greenland barely warms at all.
> **(6)** By latitude, the Arctic warms about twice the global average in both scenarios.

**[1:25–1:35] Screen: site header with the question**
> That led to our question: where on Earth is warming fastest, and how much does our emissions path change that by 2100?

**[1:35–1:55] Screen: demo the site. Press Play, toggle Low/High, hover the Arctic, click the bottom chart**
> Here's our D3 prototype. Each square is a 5-degree area colored by change since 1850–1900. You can play through
> time, switch scenarios, hover any square to see its full history, or click the global chart to jump to a year.
> Next, we'll polish the interactions and finish the write-up.
