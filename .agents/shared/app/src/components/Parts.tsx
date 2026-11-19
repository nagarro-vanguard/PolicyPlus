import { Badge } from "@continuum/ui/components/badge";
import { Trail, TrailStep } from "@continuum/ui/components/trail";
import { Facts, Section } from "./Explorer";
import { Fold } from "./Fold";
import { KindBadge } from "./KindBadge";
import { Row } from "./Rows";

// One of each piece the page's script needs to draw the detail of an action or a rule it reads on demand, rendered from
// the same components the server uses and held in a `<template>`: the script clones a piece and fills in the words, so
// the detail looks like the page and the classes have one source. The words are left empty for the script to fill.

const count = { text: "", scope: "", value: 0 };

/**
 * The pieces.
 * @returns each piece, marked `data-part`
 */
export function Parts() {
    return (
        <>
            <div data-part="trail">
                <Trail>
                    <TrailStep href="#" />
                </Trail>
            </div>
            <Badge variant="secondary" data-written-by="agent" data-part="noun" />
            <Facts facts={[count]} tests={null} />
            <Section title="" writtenBy="agent">
                {null}
            </Section>
            <Fold summary="">{null}</Fold>
            <div data-part="rows" className="flex flex-col" />
            <Row row={{ href: "#", name: "", line: "", kind: "", count }} root="" part="row-link" />
            <Row row={{ name: "", line: "", kind: "", count }} root="" part="row-plain" />
            <KindBadge kind="high" label="" writtenBy="app" part="risk-high" />
            <KindBadge kind="medium" label="" writtenBy="app" part="risk-medium" />
            <KindBadge kind="low" label="" writtenBy="app" part="risk-low" />
        </>
    );
}
