const kinds: Record<string, string> = {
    radiobutton: "Option",
    checkbox: "Tick box",
    panel: "Section",
    button: "Button",
    linkbutton: "Button",
    imagebutton: "Button",
    textbox: "Text field",
    dropdownlist: "Drop-down list",
    listbox: "List",
    label: "Text",
    literal: "Text",
    hyperlink: "Link",
    image: "Image",
    repeater: "Repeated list",
    gridview: "Table",
    listview: "Repeated list",
    formview: "Form",
    validationsummary: "Error summary",
    requiredfieldvalidator: "Check that a value is given",
    comparevalidator: "Check that values match",
    regularexpressionvalidator: "Check of the format",
    calendar: "Calendar",
    hiddenfield: "Hidden value",
    fileupload: "File chooser",
};

const shownKeys = new Set(["Text", "heading", "label", "ToolTip", "PlaceHolder", "Title", "HeaderText"]);

/**
 * Text with the markup and character codes of a page turned into what a person reads.
 * @param text the text as the page writes it
 * @returns the plain text
 */
const plain = (text: string) =>
    text
        .replaceAll(/<[^>]*>/g, " ")
        .replaceAll(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
        .replaceAll("&amp;", "&")
        .replaceAll("&nbsp;", " ")
        .replaceAll(/\s+/g, " ")
        .trim();

export type ReadableControl = { readonly text: string; readonly kind: string; readonly name: string };

/**
 * A control of a screen as a person meets it: the words on it, what kind of control it is, and its name in the page.
 * @param name the control's name in the page
 * @param declaredAs how the page declares it: its type and settings, as written
 * @returns the words it shows (its name when it shows none), its kind in plain words and its name
 */
export const readableControl = (name: string, declaredAs: string): ReadableControl => {
    const decoded = declaredAs
        .replaceAll(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
        .replaceAll("&amp;", "&");
    const [type = "", ...settings] = decoded.split(";").map((part) => part.trim());
    const shown = settings.flatMap((setting) => {
        const space = setting.indexOf(" ");
        const key = space === -1 ? setting : setting.slice(0, space);
        const value = space === -1 ? "" : plain(setting.slice(space + 1));
        return shownKeys.has(key) && value !== "" ? [value] : [];
    });
    const typeName = type.split(/\s+/)[0] ?? "";
    const kind =
        kinds[typeName.toLowerCase()] ??
        (typeName === "" ? "Control" : typeName.replaceAll(/([a-z])([A-Z])/g, "$1 $2"));
    return { text: shown.length > 0 ? shown.join(": ") : name, kind, name };
};

const windowKinds: Record<string, string> = {
    form: "Window",
    label: "Text",
    textbox: "Text field",
    button: "Button",
    listview: "List",
    treeview: "Tree",
    columnheader: "Column",
    checkbox: "Tick box",
    radiobutton: "Option",
    combobox: "Drop-down list",
    panel: "Section",
    groupbox: "Section",
    datagridview: "Table",
    menustrip: "Menu",
    toolstripmenuitem: "Menu item",
    picturebox: "Image",
    tablelayoutpanel: "Table layout",
    splitcontainer: "Split view",
    numericupdown: "Number field",
    linklabel: "Link",
    contextmenustrip: "Context menu",
    progressbar: "Progress bar",
};

/**
 * A control as a person meets it, for the declarations of a desktop window as well as those of a web page: the words on it
 * (its name when it shows none), its kind in plain words and its name. A declaration that reads `Friend WithEvents Name As
 * Type [Text = "..."]` or `Type, caption "..."` is understood; any other goes to `readableControl`.
 * @param name the control's name in the code
 * @param declaredAs how the code declares it
 * @returns the control in words
 */
export const controlOf = (name: string, declaredAs: string): ReadableControl => {
    const decoded = declaredAs.replaceAll("&amp;", "&");
    const caption = /(?:caption|Text)\s*=?\s*"([^"]*)"/.exec(decoded)?.[1];
    const typed = /\bAs\s+(?:[\w.]+\.)?(\w+)/.exec(decoded)?.[1];
    const lead = decoded.split(/[,;[(]/)[0]?.trim().split(/\s+/)[0] ?? "";
    const type = typed ?? lead;
    const known = windowKinds[type.toLowerCase()];
    if (known === undefined && !decoded.includes(", ") && decoded.includes(";")) return readableControl(name, declaredAs);
    const kind = known ?? (type === "" ? "Control" : type.replaceAll(/([a-z])([A-Z])/g, "$1 $2"));
    return { text: caption === undefined || caption.trim() === "" ? name : caption.trim(), kind, name };
};
