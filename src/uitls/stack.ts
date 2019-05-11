export class Stack<T> {

  private readonly list: T[] = []

  get(index: number) {
    return this.list[index]
  }

  push(val: T) {
    this.list.unshift(val)
  }

  pop() {
    this.list.shift()
  }

  peek() {
    return this.list[0]
  }

  isEmpty() {
    return this.list.length === 0
  }

  size() {
    return this.list.length
  }
}
