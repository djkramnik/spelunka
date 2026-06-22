import z from 'zod'

const RangeZ = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number()
])

// x1, x2, y1, y2
type Range = [number, number, number, number]

;({} as Range satisfies z.infer<typeof RangeZ>)

export const LevelZ = z.object({
  backgrounds: z.array(
    z.object({
      tile: z.string(),
      ranges: z.array(RangeZ)
    })
  )
})

export type Level = {
  backgrounds: Array<{
    tile: string
    ranges: Array<Range>
  }>
}

;({} as Level satisfies z.infer<typeof LevelZ>)

