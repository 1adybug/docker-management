export function getPathnameAndSearchParams(url: string) {
    try {
        const { pathname, searchParams } = new URL(url)
        return { pathname, searchParams }
    } catch (error) {
        try {
            const { pathname, searchParams } = new URL(url, "https://example.com")
            return { pathname, searchParams }
        } catch (error) {
            return { pathname: "/", searchParams: new URLSearchParams() }
        }
    }
}
