# Places: web sites and web APIs

Given to the briefing agent when the code suggests pages or services (`page`, `service`), or a part is a site or a service: pages a person opens in a browser, and operations other programs call over the web.

## Detection signals

- A part of kind `site` or `service`; a candidate of kind `page` or `service`; an entry point reached at an address or a route with an HTTP verb, whatever part it lies in (an API built as a library and hosted in a site still counts).

## What counts as a place

- A page is one address with its markup, code behind, browser scripts and presenter: one place.
- An action class, its template and its validation file are one page.
- A service is the operations of one handler class, or of one shared address prefix: one place, its operations the actions.
- Remote-protocol methods (XML-RPC, SOAP) are one service per protocol.
- Error and redirect pages together form one place.
- Filters, interceptors, sign-in wiring, container factories, start-up hooks and test runners are not places: kind `other`.

## How to choose the kind

- `page` for what a person opens in a browser; `service` for what another program calls. A page's own data calls back to the server are actions of the page.

## Nouns

- `page` / `pages` and `service` / `services` from the catalogue. Name a service for what it offers ("Flights for partner sites"), never by its route.

## Words to avoid

- Postback, code-behind, presenter, controller, servlet, ASPX, JSP, friendly URL, action class.

## Known traps

- A shared frame (a master page or a layout) means every page; it is not a place of its own.
- Presenter or handler events are actions of their page.
- Friendly addresses drop the file extension, and a default action is part of the address.
- Test classes named after handlers are test suites, not services.
- Response and data classes are shapes of data, never screens.
- Theme templates a blog owner edits are content, not places.
