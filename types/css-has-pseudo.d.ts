declare module "css-has-pseudo/browser" {
    export interface CssHasPseudoOptions {
        debug?: boolean
        forcePolyfill?: boolean
        hover?: boolean
        observedAttributes?: string[]
    }

    export default function cssHasPseudo(document: Document, options?: CssHasPseudoOptions): void
}
