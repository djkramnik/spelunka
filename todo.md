# Todo

- [ ] Evaluate current performance and identify opportunities to improve it.
  - [x] Discuss ways to measure game performance objectively.
  - [ ] Implement the game performance measures.
    - [x] Add initial runtime instrumentation.
      - [x] Measure animation-frame pacing and fixed-step pressure.
      - [x] Measure update, collision, finalization, and rendering time.
      - [x] Count entities, collision candidates and overlaps, tile candidates,
            simulation steps, and rendered frames.
      - [x] Print periodic summaries for inspection in browser DevTools.
    - [x] Exercise the game manually and inspect the DevTools measurements.
      - [x] Identify which metrics are useful, noisy, or missing.
      - [x] Estimate the overhead introduced by the instrumentation.
    - [x] Design durable logging from the observed measurements.
      - [x] Decide the structured log format and retained raw samples.
      - [x] Add an explicit flag for enabling performance collection.
      - [x] Add a local server endpoint for receiving browser metrics.
      - [x] Save exported runs in the local `spelunka` PostgreSQL database.
    - [ ] Add repeatable performance-testing workloads.
      - [x] Add a representative idle-start gameplay workload.
      - [ ] Add deterministic collision workloads at increasing entity counts.
      - [ ] Add correctness checks to the benchmark workloads.
    - [ ] Automate benchmark execution and result capture.
      - [ ] Run warm-up and repeated measurements against a production build.
      - [ ] Record the environment and save comparable run results.
      - [ ] Capture the unoptimized baseline.
  - [ ] Attempt targeted refactors and compare performance before and after.
- [ ] Sketch a roadmap for implementing a single complete level, including enemy interaction and level completion.
- [ ] Convert the game to Spelunky, using this project as the foundation.
