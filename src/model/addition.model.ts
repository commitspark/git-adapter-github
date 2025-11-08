export class AdditionModel {
  readonly contents: string
  constructor(
    readonly path: string,
    contents: string,
  ) {
    this.contents = Buffer.from(contents, 'utf8').toString('base64')
  }
}
