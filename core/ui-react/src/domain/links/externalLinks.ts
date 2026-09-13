function httpUrl(value: string): URL | undefined {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:"
            ? url
            : undefined;
    } catch {
        return undefined;
    }
}

export function externalLink(
    url: string,
    dereferer: unknown,
): string | undefined {
    const target = httpUrl(url);
    if (!target) {
        return undefined;
    }
    if (typeof dereferer !== "string" || dereferer.length === 0) {
        return target.toString();
    }
    const transformed = dereferer
        .replace("$s", encodeURIComponent(target.toString()))
        .replace("$us", target.toString());
    return httpUrl(transformed)?.toString();
}
