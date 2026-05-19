declare module 'colorthief' {
  export default class ColorThief {
    getColor(img: HTMLImageElement): number[]
    getPalette(img: HTMLImageElement, count?: number): number[][]
  }
}
