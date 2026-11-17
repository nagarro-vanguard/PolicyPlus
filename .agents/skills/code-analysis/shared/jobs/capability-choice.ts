/**
 * The capability a stored choice stands for now (D222): the one with its record id, or, once a later run of
 * Capabilities and entities merged it, the one naming it in `mergedFrom`. Never matched by name: a capability
 * written again under the same name may mean something else (P1.19), so an unresolved choice is the caller's to refuse.
 * @param capabilities every capability standing
 * @param chosen the record id the choice was stored with
 * @returns the capability standing for it, or none
 */
export function canonicalFor<C extends { readonly id: string; readonly mergedFrom?: readonly string[] | undefined }>(
    capabilities: readonly C[],
    chosen: string,
): C | undefined {
    const same = capabilities.find((capability) => capability.id === chosen);
    if (same !== undefined) {
        return same;
    }
    return capabilities.find(
        (capability) => capability.mergedFrom !== undefined && capability.mergedFrom.includes(chosen),
    );
}
