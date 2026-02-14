/**
 * Parse a ChatGPT conversation object into a flat list of messages.
 *
 * ChatGPT conversations use a tree/mapping structure where each node
 * has a parent pointer. This utility walks the tree to produce a
 * linear message list in chronological order.
 */

export interface ParsedMessage {
  role: string
  content: string
  timestamp?: number
}

export interface ParsedConversation {
  id: string
  title: string
  createTime?: number
  updateTime?: number
  messages: ParsedMessage[]
}

interface ConversationNode {
  id: string
  parent?: string
  children?: string[]
  message?: {
    author?: { role?: string }
    content?: {
      content_type?: string
      parts?: unknown[]
      text?: string
    }
    create_time?: number
  }
}

/**
 * Extract text content from a message node's content parts.
 */
function extractContent(node: ConversationNode): string {
  const content = node.message?.content
  if (!content) return ''

  // Handle parts array (most common)
  if (content.parts && Array.isArray(content.parts)) {
    return content.parts
      .filter((part): part is string => typeof part === 'string')
      .join('\n')
      .trim()
  }

  // Handle direct text field
  if (content.text) return content.text.trim()

  return ''
}

/**
 * Parse a raw conversation object from the ChatGPT API into a structured format.
 */
export function parseConversation(convo: unknown): ParsedConversation {
  const obj = convo as Record<string, unknown>

  const result: ParsedConversation = {
    id: (obj.id as string) || (obj.conversation_id as string) || 'unknown',
    title: (obj.title as string) || 'Untitled',
    createTime: obj.create_time as number | undefined,
    updateTime: obj.update_time as number | undefined,
    messages: [],
  }

  const mapping = obj.mapping as Record<string, ConversationNode> | undefined
  if (!mapping) return result

  // Find the root node (no parent or parent not in mapping)
  const nodes = Object.values(mapping)
  const rootNode = nodes.find(n => !n.parent || !(n.parent in mapping))

  if (!rootNode) return result

  // Walk the tree depth-first, following the last child at each level
  // (ChatGPT conversations are typically linear — one path)
  const visited = new Set<string>()
  const queue: string[] = [rootNode.id]

  while (queue.length > 0) {
    const nodeId = queue.shift()!
    if (visited.has(nodeId)) continue
    visited.add(nodeId)

    const node = mapping[nodeId]
    if (!node) continue

    // Extract message if it has content
    if (node.message) {
      const role = node.message.author?.role || 'unknown'
      const text = extractContent(node)

      // Skip system messages and empty messages
      if (text && role !== 'system') {
        result.messages.push({
          role,
          content: text,
          timestamp: node.message.create_time,
        })
      }
    }

    // Add children to queue
    if (node.children) {
      queue.push(...node.children)
    }
  }

  return result
}

/**
 * Format a Unix timestamp as an ISO date string.
 */
export function formatTimestamp(ts?: number): string {
  if (!ts) return ''
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

/**
 * Capitalize the first letter of a role name.
 */
export function formatRole(role: string): string {
  if (role === 'assistant') return 'Assistant'
  if (role === 'user') return 'User'
  if (role === 'tool') return 'Tool'
  return role.charAt(0).toUpperCase() + role.slice(1)
}
