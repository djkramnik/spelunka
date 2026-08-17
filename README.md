# Code Super Mario Bros. in JavaScript

Create a Super Mario game in vanilla JavaScript from scratch. 

This project is built during my YouTube series [Code Super Mario in JS](https://www.youtube.com/playlist?list=PLS8HfBXv9ZWWe8zXrViYbIM2Hhylx8DZx); a series by my channel [Meth Meth Method](https://www.youtube.com/MethMethMethod).

## Episode Playlist

[Code Super Mario in JS on YouTube](https://www.youtube.com/watch?v=g-FpDQ8Eqw8&list=PLS8HfBXv9ZWWe8zXrViYbIM2Hhylx8DZx)


## Running

- Clone the repository.
- Run `npm install`.
- Run `npm run db:deploy` to create the local performance database.
- Run `npm start`.
- Open `http://127.0.0.1:5173/`.

## Performance collection

Performance collection is disabled during normal play. To collect it, start the
project normally and open:

`http://127.0.0.1:5173/?perf=1`

The browser prints a summary to DevTools and posts the same versioned JSON
object to the local Express server every five seconds. Prisma stores sessions
and samples in the `spelunka` database of the Docker PostgreSQL instance at
`localhost:5432`.

The Express process prints a confirmation to stdout after each sample is
written. Use pgAdmin to inspect `performance_session` (one measured game run)
and `performance_sample` (the five-second records belonging to those runs).

Run `npm run performance:latest -- 10` to print the newest samples and their
session metadata as JSON. The optional number selects 1–100 records.

### Idle-start benchmark

Benchmark collection is opt-in and is not run for every commit. Start the game
and performance server, then open:

`http://127.0.0.1:5173/?perf=1&benchmark=idle-start`

This named workload starts without a click, disables keyboard input, collects
exactly four five-second windows, and stops collecting. The first window covers
startup and is retained as warm-up; sequences 2–4 are the steady idle samples.
The current Git commit is embedded by Vite and stored on the benchmark's
`performance_session`. Its related `performance_sample.payload` values are the
JSON benchmark numbers.

Run `npm run performance:benchmark:show -- idle-start` to print the newest run
for the current commit. Pass a full commit after the benchmark name to inspect
a selected historical commit.

### Run-right benchmark

Open `http://127.0.0.1:5173/?perf=1&benchmark=run-right` for a longer gameplay
workload. It holds right with turbo enabled for eight five-second windows
(40 seconds total), exercising movement, tile and entity collision checks, and
the hazards in the first section of level 1-1. The first window is retained as
warm-up. Controls are applied directly to Mario so the run does not depend on
window focus or synthetic keyboard events. When Mario dies, the harness creates
a new Mario and reloads a fresh level 1-1 without recreating the timer or
performance session. A completed run reports more than one `workloadAttempts`
in `window.performanceBenchmark`.

Inspect a saved run with
`npm run performance:benchmark:show -- run-right [full-git-commit]`.

Collision visualization is disabled by default because it changes the measured
render and allocation workload. Add `&debug=collision` when those overlays are
needed for development rather than benchmarking.


## Reproductions

* #### TypeScript version by [@kingdaro](https://github.com/kingdaro/)
  https://github.com/kingdaro/super-mario-typescript
  
* #### TypeScript in-browser editor by [@AFE-GmdG](https://github.com/AFE-GmdG)
  https://just-run.it/#/rySrbk86W/9

* #### Python implementation by [@mx0c](https://github.com/mx0c)
  https://github.com/mx0c/super-mario-python

* #### TypeScript version by [@x1c0](https://github.com/x1c0)
  https://github.com/x1c0/super-mario-typescript


## Contributing

Please contribute if you see something wrong, but I can unforunately not merge your PR directly into 
`master` as I use Git commits as a script for creating the tutorial and commits out of sequence would throw me off.
