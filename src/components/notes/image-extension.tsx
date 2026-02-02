import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'

export interface ImageOptions {
  inline: boolean
  allowBase64: boolean
  HTMLAttributes: Record<string, any>
  onDelete?: (src: string) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setImage: (options: { src: string; alt?: string; title?: string; width?: number }) => ReturnType
      setImageSize: (options: { width: number }) => ReturnType
    }
  }
}

export const CustomImage = Image.extend<ImageOptions>({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width') || element.style.width?.replace('px', ''),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {}
          }
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px`,
          }
        },
      },
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align') || 'center',
        renderHTML: attributes => {
          return {
            'data-align': attributes.align,
          }
        },
      },
      wrap: {
        default: false,
        parseHTML: element => element.getAttribute('data-wrap') === 'true',
        renderHTML: attributes => {
          return {
            'data-wrap': attributes.wrap ? 'true' : 'false',
          }
        },
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageSize:
        ({ width }: { width: number }) =>
        ({ commands }: { commands: any }) => {
          return commands.updateAttributes('image', { width })
        },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const align = (HTMLAttributes['data-align'] || 'center') as 'left' | 'center' | 'right'
    const wrap = HTMLAttributes['data-wrap'] === 'true'
    const alignClass = {
      left: 'mr-auto',
      center: 'mx-auto',
      right: 'ml-auto',
    }[align] || 'mx-auto'

    return [
      'figure',
      {
        class: `image-wrapper ${alignClass}`,
        'data-align': align,
        'data-wrap': wrap ? 'true' : 'false',
      },
      [
        'img',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          class: 'rounded-lg max-w-full h-auto cursor-pointer',
        }),
      ],
    ]
  },
})