export class Stack<T> {

  private readonly list: T[] = []

  get(index: number) {
    return this.list[index]
  }

  push(val: T) {
    this.list.push(val)
  }

  pop() {
    this.list.pop()
  }

  peek() {
    return this.list[this.list.length - 1]
  }

  isEmpty() {
    return this.list.length === 0
  }

  size() {
    return this.list.length
  }
}
