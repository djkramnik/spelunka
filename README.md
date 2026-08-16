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
written. Use pgAdmin to inspect the `PerformanceSession` and
`PerformanceSample` tables directly.


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
