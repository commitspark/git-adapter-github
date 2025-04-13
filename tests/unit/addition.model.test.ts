import { AdditionModel } from '../../src/addition.model'

describe('AdditionModel', () => {
  it('should base64-encode content', async () => {
    const path = 'a/b'
    const content = 'Test 🙂'
    const additionModel = new AdditionModel(path, content)

    expect(additionModel.contents).toStrictEqual('VGVzdCDwn5mC')
  })

  it('should keep the path unmodified', async () => {
    const path = 'a/b'
    const content = 'Test 🙂'
    const additionModel = new AdditionModel(path, content)

    expect(additionModel.path).toStrictEqual(path)
  })
})
