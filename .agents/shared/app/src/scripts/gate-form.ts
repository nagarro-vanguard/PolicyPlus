// The decision page's two forms: the reason that goes into the confirm command, and the words that go into the command that asks for
// changes. Nothing is sent anywhere; the page builds a command and the button copies it.
import { withChanges, withReason } from "../lib/gate-command";
import { fresh, onPage } from "./page";

onPage(() => {
const form = document.querySelector<HTMLElement>("[data-gate-form]");
if (form !== null && fresh(form)) {
    const why = form.querySelector<HTMLInputElement>("[data-why]");
    const text = form.querySelector<HTMLElement>("[data-command-text]");
    const copy = form.querySelector<HTMLButtonElement>("[data-confirm] button");
    const base = form.dataset.command ?? "";
    const syncConfirm = () => {
        const next = withReason(base, why?.value ?? "");
        if (text !== null) text.textContent = next;
        if (copy !== null) copy.dataset.copyText = next;
    };
    why?.addEventListener("input", syncConfirm);
    syncConfirm();

    const changes = form.querySelector<HTMLTextAreaElement>("[data-changes]");
    const out = form.querySelector<HTMLElement>("[data-changes-command]");
    const ask = form.querySelector<HTMLButtonElement>("[data-ask] button");
    const askBase = form.dataset.changesBase ?? "";
    const syncChanges = () => {
        const next = withChanges(askBase, changes?.value ?? "");
        if (out !== null) out.textContent = next;
        if (ask !== null) {
            ask.dataset.copyText = next;
            ask.disabled = (changes?.value.trim() ?? "") === "";
        }
    };
    changes?.addEventListener("input", syncChanges);
    syncChanges();
}
});
