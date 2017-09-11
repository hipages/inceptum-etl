export function mapRecord<T>(input, map1): Partial<T> {
    const output: Partial<T> = {};

    for (const [s, t] of Object.entries(map1)) {
        output[t] = input[s];
    }
    return output;
}
