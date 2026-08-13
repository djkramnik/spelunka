# Todo

- [ ] Evaluate current performance and identify opportunities to improve it.
  - [x] Discuss ways to measure game performance objectively.
  - [ ] Implement the game performance measures.
    - [ ] Add initial runtime instrumentation.
      - [ ] Measure animation-frame pacing and fixed-step pressure.
      - [ ] Measure update, collision, finalization, and rendering time.
      - [ ] Count entities, collision candidates and overlaps, tile candidates,
            simulation steps, and rendered frames.
      - [ ] Print periodic summaries for inspection in browser DevTools.
    - [ ] Exercise the game manually and inspect the DevTools measurements.
      - [ ] Identify which metrics are useful, noisy, or missing.
      - [ ] Estimate the overhead introduced by the instrumentation.
    - [ ] Design durable logging from the observed measurements.
      - [ ] Decide the structured log format and retained raw samples.
      - [ ] Add an explicit flag for enabling performance collection.
      - [ ] Add a local server endpoint for receiving browser metrics.
      - [ ] Save exported runs in a gitignored `performance-logs/` directory.
    - [ ] Add repeatable performance-testing workloads.
      - [ ] Add a representative gameplay workload.
      - [ ] Add deterministic collision workloads at increasing entity counts.
      - [ ] Add correctness checks to the benchmark workloads.
    - [ ] Automate benchmark execution and result capture.
      - [ ] Run warm-up and repeated measurements against a production build.
      - [ ] Record the environment and save comparable run results.
      - [ ] Capture the unoptimized baseline.
  - [ ] Attempt targeted refactors and compare performance before and after.
- [ ] Sketch a roadmap for implementing a single complete level, including enemy interaction and level completion.
- [ ] Convert the game to Spelunky, using this project as the foundation.
