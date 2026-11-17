/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { FactCard, RegisterRow, TopicBlock } from "./components/facts.tsx";
import { Fragment, jsx, type Html } from "./jsx";

export const factsSample: { id: string; title: string; lede: string; content: Html } = {
    id: "facts",
    title: "Fact cards, topics and registers",
    lede: "Every piece of information is a fact card: the statement open, what the code shows and the context to copy folded. A topic is one question about one subject, its answer open and its facts folded. A register lists cards one line each.",
    content: (
        <>
            <TopicBlock
                id="topic-1"
                question="How does work enter the web API?"
                answer={
                    <FactCard
                        id="fact-1"
                        subject="Web API › How work enters"
                        statement="Email delivery events from the mail service are accepted without checking who sent them."
                        standing={{ status: "pass", label: "shown by the code" }}
                        risk={{ status: "fail", label: "High risk · access control" }}
                        from="the web API's webhook handling (2 places)"
                        shows={[
                            "accepts the list of events and saves it; a note says a check is to do",
                            "the address is open to anyone, with no sign-in rule",
                        ]}
                        context={
                            "## Fact (shown by the code)\nEmail delivery events are accepted without checking who sent them."
                        }
                        isNew
                    />
                }
                facts={[
                    <FactCard
                        id="fact-3"
                        subject="Web API › How work enters"
                        statement="The mail service sends its events to one address of the web API."
                        standing={{ status: "pass", label: "shown by the code" }}
                        from="the web API's webhook handling (1 place)"
                        shows={["the one address the mail service is given"]}
                        context={"## Fact (shown by the code)\nThe mail service sends its events to one address."}
                        isNew={false}
                    />,
                    <FactCard
                        id="fact-2"
                        subject="Web API › How work enters"
                        statement="We assume the gateway in front of the web API does not check the sender either."
                        standing={{ status: "warn", label: "assumed" }}
                        from="no file in scope shows the gateway"
                        decides="Whether to add a sender check before the rebuild."
                        shows={[]}
                        context={"## Assumption (assumed)\nConfirm with: the gateway's settings."}
                        isNew={false}
                    />,
                ]}
            />
            <ul class="register" aria-label="Risks">
                <RegisterRow
                    href="#fact-1"
                    text="Email delivery events are accepted without checking who sent them."
                    where="Web API"
                    marks={[{ status: "fail", label: "high" }]}
                />
            </ul>
        </>
    ),
};
