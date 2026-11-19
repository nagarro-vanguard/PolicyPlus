import { Badge } from "@continuum/ui/components/badge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@continuum/ui/components/input-group";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@continuum/ui/components/item";
import { Textarea } from "@continuum/ui/components/textarea";
import { Trail, TrailStep } from "@continuum/ui/components/trail";
import { Search } from "lucide-react";
import { copy } from "../lib/copy";
import { AssistantCopy } from "./AssistantCopy";
import { Facts, Section } from "./Explorer";
import { Fold } from "./Fold";
import { KindBadge } from "./KindBadge";
import { CodeTag, Row } from "./Rows";

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
            <Row row={{ href: "#", name: "", code: "", line: "", kind: "", count }} root="" part="row-link" />
            <Row row={{ name: "", code: "", line: "", kind: "", count }} root="" part="row-plain" />
            <KindBadge kind="high" label="" writtenBy="app" part="risk-high" />
            <KindBadge kind="medium" label="" writtenBy="app" part="risk-medium" />
            <KindBadge kind="low" label="" writtenBy="app" part="risk-low" />
            <CodeTag code="" />
            <InputGroup className="max-w-sm" data-part="filter">
                <InputGroupAddon>
                    <Search aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput type="search" aria-label={copy.explorer.filterRows} placeholder={copy.explorer.filterHint} />
            </InputGroup>
            <p className="text-muted-foreground" data-written-by="app" data-part="no-match">
                {copy.site.noMatch}
            </p>
            <Item size="xs" variant="outline" className="min-w-0 flex-1 basis-40" render={<a href="#" />} data-part="pager-link">
                <ItemContent className="min-w-0">
                    <ItemDescription className="text-xs" data-written-by="app" />
                    <ItemTitle className="line-clamp-none" data-written-by="agent" />
                </ItemContent>
            </Item>
            <div className="flex flex-col items-start gap-spacing-md" data-for-assistant data-part="assistant-block">
                <AssistantCopy file="" kilobytes={1} />
                <Textarea className="font-mono text-xs" readOnly hidden aria-label={copy.explorer.forAssistant} data-assistant-fallback rows={8} />
            </div>
        </>
    );
}
