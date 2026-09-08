/// <reference types="vite/client" />

declare module '*.mdx' {
  import type { ComponentType } from 'react'
  export const frontmatter: Record<string, any> | undefined
  const component: ComponentType
  export default component
}
