/** Synthetic only: exercises a broad frontier and the equivalent linear path. */
export function makeLargeConversation(count: number, shape: 'wide' | 'linear' = 'wide') {
  interface Node {
    id: string
    parent?: string
    children: string[]
    message?: {
      author: { role: string }
      content: { parts: string[] }
      create_time: number
    }
  }

  const mapping: Record<string, Node> = { root: { id: 'root', children: [] } }
  for (let i = 0; i < count; i++) {
    const id = `m${i}`
    const parent = shape === 'wide' || i === 0 ? 'root' : `m${i - 1}`
    mapping[parent].children.push(id)
    mapping[id] = {
      id,
      parent,
      children: [],
      message: {
        author: { role: i % 2 ? 'assistant' : 'user' },
        content: { parts: [`訊息 ${i} 🧪 café e\u0301\n\t<&> "quote"`] },
        create_time: 1700000000 + i,
      },
    }
  }

  return { id: 'synthetic-large', title: 'Synthetic 🧪 <&>', create_time: 1700000000, mapping }
}
