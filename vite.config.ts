import { defineConfig } from 'vite';
import mdx from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeMathjaxSvg from 'rehype-mathjax/svg';
import path from 'path';

function remarkReadingTime() {
  return (tree: any, file: any) => {
    let wordCount = 0;
    function walk(node: any) {
      if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code') {
        const text = node.value || '';
        const words = text.trim().split(/\s+/).filter(Boolean);
        wordCount += words.length;
      }
      if (node.children) {
        for (const child of node.children) {
          walk(child);
        }
      }
    }
    walk(tree);
    const minutes = Math.max(1, Math.ceil(wordCount / 200));
    file.data = file.data || {};
    file.data.matter = file.data.matter || {};
    if (!file.data.matter.readTime) {
      file.data.matter.readTime = `${minutes} min read`;
    }
    file.data.matter.wordCount = wordCount;
  };
}

function remarkSmartDashes() {
  return (tree: any) => {
    function replaceTextDashes(value: string) {
      return value
        .replace(/(\\text\{[^{}]*?)---(?=[^{}]*\})/g, '$1—')
        .replace(/(\\text\{[^{}]*?)--(?=[^{}]*\})/g, '$1–')
    }

    function replaceMathText(children: any[], value: string) {
      for (const child of children || []) {
        if (child.type === 'text') {
          child.value = value
          return true
        }
        if (child.children && replaceMathText(child.children, value)) {
          return true
        }
      }
      return false
    }

    function walk(node: any) {
      if (node.type === 'text') {
        let val = node.value || '';
        // Replace triple dashes with em-dash (—)
        val = val.replace(/---/g, '—');
        // Replace double dashes with en-dash (–)
        val = val.replace(/--/g, '–');
        node.value = val;
      } else if (node.type === 'math' || node.type === 'inlineMath') {
        node.value = replaceTextDashes(node.value || '');
        replaceMathText(node.data?.hChildren, node.value)
      } else if (
        node.type !== 'code' &&
        node.type !== 'inlineCode' &&
        node.type !== 'math' &&
        node.type !== 'inlineMath'
      ) {
        if (node.children) {
          for (const child of node.children) {
            walk(child);
          }
        }
      }
    }
    walk(tree);
  };
}

function remarkMarkStandaloneInlineMath() {
  return (tree: any) => {
    function walk(node: any) {
      if (
        node.type === 'paragraph' &&
        node.children?.length === 1 &&
        node.children[0].type === 'inlineMath'
      ) {
        node.data = node.data || {}
        node.data.hProperties = node.data.hProperties || {}
        node.data.hProperties['data-math-display'] = 'true'
      }

      if (node.children) {
        for (const child of node.children) {
          walk(child)
        }
      }
    }

    walk(tree)
  }
}

// Converts MDX expressions that are plain mana costs (e.g. `{RR}`, `{2}`, `{X}`)
// into <Mana cost="..." /> elements, merging adjacent costs into one element,
// and injects the component import when any are found.
function remarkMana() {
  // Parse only 1-2 character costs from the standard mana symbol set,
  // so legitimate JS expressions (e.g. `{0.07}`) are never touched.
  const MANA_COST = /^[0-9WUBRGX]{1,2}$/
  const MANA_IMPORT = "import { Mana } from '@/components/articles/Mana'"

  return (tree: any) => {
    let converted = 0

    function walk(node: any) {
      const children = node.children
      if (!Array.isArray(children)) return

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        // MDX v3 expression node types (mdast-util-mdx-expression v2)
        const isExpression =
          child.type === 'mdxTextExpression' || child.type === 'mdxFlowExpression'

        if (isExpression && MANA_COST.test(child.value || '')) {
          const cost = child.value
          // Match the element level to the expression level (inline vs block).
          const isFlow = child.type === 'mdxFlowExpression'
          const elementType = isFlow ? 'mdxJsxFlowElement' : 'mdxJsxTextElement'
          const prev = children[i - 1]
          // Only merge adjacent inline costs ({RR}{WW} → one group); block-level
          // expressions are separate blocks and stay independent.
          if (!isFlow && prev && prev.type === 'mdxJsxTextElement' && prev.name === 'Mana') {
            const attr = prev.attributes.find((a: any) => a.name === 'cost')
            attr.value += cost
            children.splice(i, 1)
            i--
          } else {
            child.type = elementType
            child.name = 'Mana'
            child.attributes = [{ type: 'mdxJsxAttribute', name: 'cost', value: cost }]
            child.children = []
            delete child.value
          }
          converted++
        } else {
          walk(child)
        }
      }
    }

    walk(tree)

    if (converted > 0) {
      // MDX v3 lifts mdxjsEsm statements into the module via data.estree, and
      // does so before the JSX scope analysis — so the import is in scope when
      // the compiler decides how to resolve `Mana`. The estree below is the
      // acorn parse of MANA_IMPORT (positions included for source maps).
      tree.children.unshift({
        type: 'mdxjsEsm',
        value: MANA_IMPORT,
        data: {
          estree: {
            type: 'Program',
            sourceType: 'module',
            body: [
              {
                type: 'ImportDeclaration',
                start: 0,
                end: 49,
                specifiers: [
                  {
                    type: 'ImportSpecifier',
                    start: 9,
                    end: 13,
                    imported: { type: 'Identifier', start: 9, end: 13, name: 'Mana' },
                    local: { type: 'Identifier', start: 9, end: 13, name: 'Mana' }
                  }
                ],
                source: {
                  type: 'Literal',
                  start: 21,
                  end: 49,
                  value: '@/components/articles/Mana',
                  raw: "'@/components/articles/Mana'"
                }
              }
            ]
          }
        }
      })
    }
  }
}

// Wraps the "Appendix" section (its h2 and everything after it) in a
// <div class="article-appendix"> so it can be given a distinct background,
// echoing the hero header. No-op for articles without an appendix.
function rehypeAppendix() {
  function collectText(node: any) {
    if (node.type === 'text') return node.value || ''
    if (node.children) return node.children.map(collectText).join('')
    return ''
  }

  return (tree: any) => {
    const children = tree.children
    if (!Array.isArray(children)) return

    const start = children.findIndex(
      (node: any) =>
        node.type === 'element' &&
        node.tagName === 'h2' &&
        /^appendix/i.test(collectText(node).trim())
    )
    if (start === -1) return

    const wrapped = children.slice(start)
    children.splice(start, wrapped.length, {
      type: 'element',
      tagName: 'div',
      // article-prose carries the typography (it is normally provided by the
      // surrounding <article class="article-prose">); the reading view lifts
      // this node into a full-width band, so the class must travel with it.
      // The lift effect then moves it onto the content column so the TOC
      // sidebar in the spacer is not styled by the body rules.
      properties: { className: 'article-appendix article-prose' },
      children: wrapped
    })
  }
}

export default defineConfig({
  root: 'src',
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [
          remarkFrontmatter,
          remarkReadingTime,
          [remarkMdxFrontmatter, { name: 'frontmatter' }],
          remarkGfm,
          remarkMath,
          remarkSmartDashes,
          remarkMarkStandaloneInlineMath,
          remarkMana,
        ],
        rehypePlugins: [rehypeMathjaxSvg, rehypeAppendix],
      }),
    },
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@videreproject/sql-builder': path.resolve(__dirname, './packages/sql-builder/src')
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    open: false
  }
});
