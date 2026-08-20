import { cva, type VariantProps } from 'class-variance-authority'

export { default as Empty } from './Empty.vue'
export { default as EmptyContent } from './EmptyContent.vue'
export { default as EmptyDescription } from './EmptyDescription.vue'
export { default as EmptyHeader } from './EmptyHeader.vue'
export { default as EmptyMedia } from './EmptyMedia.vue'
export { default as EmptyTitle } from './EmptyTitle.vue'

export const emptyMediaVariants = cva(
  'relative flex size-12 shrink-0 items-center justify-center rounded-md border-dashed bg-background text-foreground [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-6',
  {
    variants: {
      variant: {
        default: 'dark:bg-muted/50 [&_svg:not([class*=\'text-\'])]:text-muted-foreground border-none bg-muted text-foreground',
        icon: 'border border-dashed',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type EmptyMediaVariants = VariantProps<typeof emptyMediaVariants>
