export class AdditionModel {
  readonly contents: string
  constructor(readonly path: string, contents: string) {
    this.contents = btoa(contents)
  }
}
