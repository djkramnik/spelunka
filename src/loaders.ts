import {z} from 'zod';

export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image), {once: true});
        image.addEventListener('error', () => {
            reject(new Error(`Unable to load image: ${url}`));
        }, {once: true});
        image.src = url;
    });
}

export async function loadJSON<Schema extends z.ZodType>(
    url: string,
    schema: Schema,
): Promise<z.output<Schema>> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Unable to load JSON (${response.status}): ${url}`);
    }

    const data: unknown = await response.json();
    return schema.parse(data);
}
