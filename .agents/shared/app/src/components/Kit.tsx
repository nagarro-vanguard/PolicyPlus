import { Badge } from "@continuum/ui/components/badge";
import { Button } from "@continuum/ui/components/button";
import { Sections } from "@continuum/ui/components/details";
import { ErrorState } from "@continuum/ui/components/error-state";
import { Field } from "@continuum/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@continuum/ui/components/input-group";
import { Kbd } from "@continuum/ui/components/kbd";
import { NoDataState } from "@continuum/ui/components/no-data-state";
import { PageOpening } from "@continuum/ui/components/page-opening";
import { Separator } from "@continuum/ui/components/separator";
import { Skeleton } from "@continuum/ui/components/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@continuum/ui/components/table";
import { RefreshCw, Search } from "lucide-react";
import type { ReactNode } from "react";
import type { NodeView } from "../case/view";
import { Explorer, Section } from "./Explorer";
import { Fold } from "./Fold";
import { KindBadge } from "./KindBadge";
import { Rows } from "./Rows";
import { Crumbs } from "./shell/Crumbs";

// The kit page's body, the app's Storybook: every primitive the app uses and every composite it builds from them, in
// each variant and state, side by side in the light and the dark theme, and in both densities. Only the islands (the
// menu's sheet) are left out: they are judged on a page at a narrow width.

/** A node as the Explorer shows it, written by hand so the kit needs no case. */
const sample: NodeView = {
    key: "capability/keeping-records",
    level: "capability",
    href: "#",
    name: "Keeping records",
    code: null,
    summary: "People add, change and remove the records they keep.",
    noun: { one: "capability", many: "capabilities" },
    crumbs: [{ href: "#", name: "Example system" }, { href: "#r", name: "Records" }],
    facts: [
        { text: "16 places: 9 pages, 7 services", scope: "places this capability's people and callers use, each counted once", value: 16 },
        { text: "42 business rules", scope: "business rules this capability decides, each counted once", value: 42 },
        { text: "1 risk", scope: "risks that name this capability", value: 1 },
    ],
    tests: { text: "3 test suites", scope: "groups of automated tests that check this capability", value: 3 },
    children: {
        heading: "Places",
        rows: [
            { href: "#", name: "Record list", line: "Lists the records and opens one.", count: { text: "4 actions", scope: "actions of this page that this capability uses", value: 4 }, kind: "page" },
            { href: "#", name: "Records service", line: "Other programs read and save records here.", count: { text: "1 action", scope: "actions of this service that this capability uses", value: 1 }, kind: "service", risk: { word: "Medium risk", badge: "medium" } },
        ],
    },
    folds: [{ kind: "openPoints", title: "Open points", rows: [{ name: "Whether a removed record can come back is not said in the code." }] }],
    up: { href: "#", name: "Records" },
    prev: null,
    next: { href: "#", name: "Reporting" },
    lateral: [{ relation: "alsoUsedBy", label: "Also used by", links: [{ href: "#", name: "Reporting", count: { text: "2 actions", scope: "actions of this page that this capability uses", value: 2 } }] }],
    assistant: { file: "#", kilobytes: 12, fuller: null },
    diagrams: [{ key: "flow/keeping-records", title: "How the work passes through it", question: null, legend: ["calls"], text: ["Record list calls Records service"] }],
};
const roles = ["background", "card", "popover", "primary", "secondary", "muted", "accent", "border", "input", "ring", "destructive", "foreground", "muted-foreground"];
const scales = [
    { name: "Severity", kinds: ["high", "medium", "low"] },
    { name: "State", kinds: ["changes-state", "read-only"] },
    { name: "Provenance", kinds: ["stated", "inferred", "assumed"] },
] as const;
const sizes = [
    ["text-xs", "chips, counts and hints, 12 pixels"],
    ["text-sm", "body and rows, 13 pixels"],
    ["text-base", "section headings and the lede, 16 pixels"],
] as const;
const steps = ["2xs", "xs", "md", "lg", "xxl", "4xl", "5xl"] as const;
const stepWidth: Record<(typeof steps)[number], string> = {
    "2xs": "w-spacing-2xs",
    xs: "w-spacing-xs",
    md: "w-spacing-md",
    lg: "w-spacing-lg",
    xxl: "w-spacing-xxl",
    "4xl": "w-spacing-4xl",
    "5xl": "w-spacing-5xl",
};

/**
 * Shows what it holds twice, once in the light theme and once in the dark, so a component is judged in both at once.
 * @param props the density and what to show
 * @returns the two panels
 */
function KitPair({ density = "compact", children }: { readonly density?: "compact" | "cozy"; readonly children: ReactNode }) {
    return (
        <div className="grid gap-spacing-xl lg:grid-cols-2">
            {(["light", "dark"] as const).map((theme) => (
                <div key={theme} data-theme={theme} data-density={density === "cozy" ? "cozy" : undefined} className="flex min-w-0 flex-col gap-spacing-lg rounded-surface border border-border bg-background p-spacing-xl text-foreground">
                    <p className="text-xs text-muted-foreground">
                        {theme === "light" ? "Light" : "Dark"}
                        {density === "cozy" ? ", cozy density" : ""}
                    </p>
                    {children}
                </div>
            ))}
        </div>
    );
}

const Row = ({ children }: { readonly children: ReactNode }) => <div className="flex flex-wrap items-center gap-spacing-md">{children}</div>;

/**
 * The kit.
 * @returns every component in each state
 */
export function Kit() {
    return (
        <Sections>
            <Section title="Colour roles" writtenBy="app">
                <p className="text-sm text-muted-foreground">One accent marks the main action and the focus ring only. A met rule stays in the text colour.</p>
                <div className="grid grid-cols-2 gap-spacing-md sm:grid-cols-4">
                    {roles.map((role) => (
                        <div key={role} className="flex items-center gap-spacing-md text-xs">
                            <i className="size-6 shrink-0 rounded-control border border-border" style={{ background: `var(--${role})` }} />
                            <code>{`--${role}`}</code>
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Semantic scales" writtenBy="app">
                <p className="text-sm text-muted-foreground">Severity, state and provenance each have three tokens (text, surface, edge) and always show an icon and a word.</p>
                <KitPair>
                    {scales.map((scale) => (
                        <div key={scale.name} className="flex flex-col gap-spacing-xs">
                            <h3 className="text-sm font-medium">{scale.name}</h3>
                            <Row>
                                {scale.kinds.map((kind) => (
                                    <KindBadge key={kind} kind={kind} />
                                ))}
                            </Row>
                        </div>
                    ))}
                    <h3 className="text-sm font-medium">Neutral and the design system&apos;s own</h3>
                    <Row>
                        <KindBadge label="Policy file" />
                        <Badge>Default</Badge>
                        <Badge variant="outline">Outline</Badge>
                        <Badge variant="destructive">Destructive</Badge>
                    </Row>
                </KitPair>
            </Section>

            <Section title="Type scale" writtenBy="app">
                <div className="flex flex-col gap-spacing-md">
                    {sizes.map(([size, words]) => (
                        <p key={size} className={size}>{`${size}, ${words}: the policy file holds 286 rules.`}</p>
                    ))}
                    <p>
                        <code>Mono: PolicyPlus.vb:120</code>
                    </p>
                    <p className="tabular-nums">Tabular figures: 1,111 and 8,888 line up in a column.</p>
                </div>
            </Section>

            <Section title="Spacing and corners" writtenBy="app">
                <KitPair>
                    {steps.map((step) => (
                        <div key={step} className="flex items-center gap-spacing-md">
                            <code className="w-10 text-xs">{step}</code>
                            <span className={`h-3 rounded-full bg-primary ${stepWidth[step]}`} />
                        </div>
                    ))}
                    <Row>
                        <span className="rounded-control border border-border px-spacing-md py-spacing-xs">Control</span>
                        <span className="rounded-surface border border-border px-spacing-md py-spacing-xs">Surface</span>
                        <span className="rounded-overlay border border-border px-spacing-md py-spacing-xs">Overlay</span>
                    </Row>
                </KitPair>
            </Section>

            <Section title="Page opening and trail" writtenBy="app">
                <KitPair>
                    <Crumbs crumbs={[{ href: "#", name: "Overview" }, { href: "#p", name: "Policy changes" }]} current="Edit a policy" root="" />
                    <PageOpening label="Capability" title="Edit a policy" summary="Change one setting and see what it does to the file." />
                </KitPair>
            </Section>

            <Section title="Explorer" writtenBy="app">
                <p className="text-sm text-muted-foreground">One node of the hierarchy, the same anatomy at every level.</p>
                <KitPair>
                    <Explorer view={sample} root="" />
                </KitPair>
            </Section>

            <Section title="Sections and folds" writtenBy="app">
                <KitPair>
                    <Section title="A section with a rule" writtenBy="app">
                        <p>A heading and a thin rule, never a card.</p>
                    </Section>
                    <div className="border-t border-border">
                        <Fold summary="A fold, shut">
                            <p>What shows on demand.</p>
                        </Fold>
                        <Fold summary="A fold, open" open>
                            <p>Opened by the page, not by a script.</p>
                        </Fold>
                    </div>
                </KitPair>
            </Section>

            <Section title="Buttons and keys" writtenBy="app">
                <p className="text-sm text-muted-foreground">One primary button per page, for the main action.</p>
                <KitPair>
                    <Row>
                        <Button>Confirm choice</Button>
                        <Button variant="secondary">Copy a brief</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="ghost">Cancel</Button>
                    </Row>
                    <Row>
                        <Button disabled>Confirm choice</Button>
                        <Button variant="secondary" disabled>
                            Copy a brief
                        </Button>
                        <Button variant="outline">
                            <RefreshCw aria-hidden="true" />
                            Try again
                        </Button>
                        <Button variant="link" render={<a href="#" />} nativeButton={false}>
                            As a link
                        </Button>
                    </Row>
                    <p>
                        Press <Kbd>/</Kbd> to search, <Kbd>Esc</Kbd> to close.
                    </p>
                </KitPair>
            </Section>

            <Section title="Fields" writtenBy="app">
                <KitPair>
                    <Field label="Name of the rule" hint="As the code names it." placeholder="Type a name" />
                    <Field label="Filter" error="Type at least two letters." defaultValue="a" />
                    <InputGroup>
                        <InputGroupAddon>
                            <Search aria-hidden="true" />
                        </InputGroupAddon>
                        <InputGroupInput aria-label="Filter rules" placeholder="Filter rules" />
                    </InputGroup>
                </KitPair>
            </Section>

            <Section title="Table" writtenBy="app">
                <KitPair>
                    <Table>
                        <TableCaption>Rules by capability</TableCaption>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Capability</TableHead>
                                <TableHead>Risk</TableHead>
                                <TableHead numeric>Rules</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(
                                [
                                    ["Edit a policy", "high", "286"],
                                    ["Import a file", "medium", "41"],
                                    ["Open the help", "low", "3"],
                                ] as const
                            ).map(([name, kind, rules]) => (
                                <TableRow key={name}>
                                    <TableCell>{name}</TableCell>
                                    <TableCell>
                                        <KindBadge kind={kind} />
                                    </TableCell>
                                    <TableCell numeric>{rules}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </KitPair>
            </Section>

            <Section title="The four states" writtenBy="app">
                <p className="text-sm text-muted-foreground">Every list and page shows content, loading, no data and error, the same way.</p>
                <KitPair>
                    <h3 className="text-sm font-medium">Content</h3>
                    <Rows rows={sample.children.rows} root="" />
                    <Separator />
                    <h3 className="text-sm font-medium">Loading</h3>
                    <div role="status" aria-label="Loading" className="flex flex-col gap-spacing-md">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/5" />
                    </div>
                    <h3 className="text-sm font-medium">No data</h3>
                    <NoDataState title="No risks found" message="We found nothing here. Check the other groups, or search for a rule." />
                    <h3 className="text-sm font-medium">Error</h3>
                    <ErrorState title="The rules did not load" message="Something went wrong while reading them.">
                        <Button variant="outline">
                            <RefreshCw aria-hidden="true" />
                            Try again
                        </Button>
                    </ErrorState>
                    <h3 className="text-sm font-medium">Compact</h3>
                    <NoDataState compact title="No risks found" message="Nothing to show for this screen." />
                    <ErrorState compact title="The rules did not load" message="Try again in a moment." />
                </KitPair>
            </Section>

            <Section title="Density" writtenBy="app">
                <p className="text-sm text-muted-foreground">Rows and tables are scan density. A person chooses cozy; no page sets its own.</p>
                <KitPair>
                    <Rows rows={[sample.children.rows[0] ?? { name: "" }]} root="" />
                    <Row>
                        <Button variant="secondary">Secondary</Button>
                        <KindBadge kind="read-only" />
                    </Row>
                </KitPair>
                <KitPair density="cozy">
                    <Rows rows={[sample.children.rows[0] ?? { name: "" }]} root="" />
                    <Row>
                        <Button variant="secondary">Secondary</Button>
                        <KindBadge kind="read-only" />
                    </Row>
                </KitPair>
            </Section>
        </Sections>
    );
}
