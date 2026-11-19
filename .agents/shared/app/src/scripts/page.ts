// Pages are swapped by the view transition router without a reload, so a script that sets up a page runs each time a page is
// shown, not once. `init` finds its elements in the page now showing and leaves a mark on each it has set up, so it can be
// called any number of times. Called at once (the page may already be there) and after every navigation.
export const onPage = (init: () => void) => {
    init();
    document.addEventListener("astro:page-load", init);
};

/** Whether an element has been set up already; marks it when it has not. */
export const fresh = (element: HTMLElement) => {
    if (element.dataset.ready !== undefined) return false;
    element.dataset.ready = "true";
    return true;
};
