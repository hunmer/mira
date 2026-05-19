declare module 'pinyin' {
  interface Options {
    style?: number
    heteronym?: boolean
    segment?: boolean
  }

  function pinyin(words: string, options?: Options): string[][]

  export default pinyin
  export const STYLE_NORMAL: number
  export const STYLE_TONE: number
  export const STYLE_TONE2: number
  export const STYLE_TO3NE: number
  export const STYLE_INITIALS: number
  export const STYLE_FIRST_LETTER: number
}
