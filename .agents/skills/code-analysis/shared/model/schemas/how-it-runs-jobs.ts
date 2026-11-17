import { Schema } from "effect";
import { SystemPartId, TechnologyId, about, forPerson } from "../shared-fields";
import { Fact } from "./fact";

export const ListedJob = Schema.Struct({
    name: Schema.String.annotate(
        forPerson(
            "The job's name for a reader: its technology; its first part and how many more; or its part and which area (H1). Nothing looks a job up by it: its job id does.",
        ),
    ),
    kind: Schema.Literals(["technology", "parts", "area"]).annotate(
        about(
            "What the job studies: a framework or platform, whole parts packed together, or one area of a part too large for one job.",
        ),
    ),
    technology: Schema.optionalKey(
        TechnologyId.annotate(about("A technology job's framework or platform, by its record id.")),
    ),
    parts: Schema.Array(SystemPartId).annotate(about("The parts the job covers, each by its record id.")),
    jobId: Schema.String.annotate(about("The job id: the name of the job's folder.")),
    preparedAgainst: Schema.String.annotate(
        about("The hash of the job's definition when it was prepared, so `finish` sees a change at Inventory."),
    ),
}).annotate(about("One How it runs job, as `prepare` lists it."));

export const JobList = Schema.Array(ListedJob).annotate(
    about("How it runs' jobs: the technology jobs, the packed parts, and the areas of large parts."),
);

export const StudyTopics = Schema.Struct({
    technology: Schema.optionalKey(
        Schema.String.annotate(forPerson("A technology job's framework or platform, whose rules the study states.")),
    ),
    registryPath: Schema.String.annotate(
        about("The file holding the parts and technologies the study's facts may name, by record id."),
    ),
    analysisRequestPath: Schema.optionalKey(
        Schema.String.annotate(about("The request, whose Supporting Material lists documents outside the code.")),
    ),
    topics: Schema.Array(
        Schema.Struct({
            subject: Fact.fields.subject,
            subjectName: Schema.String.annotate(
                about("What the topic is about, by the name the person knows it by: the part, technology or system."),
            ),
            aspect: Schema.String.annotate(
                about("The aspect the topic asks about, by its id in the catalogue's aspects."),
            ),
            question: Schema.String.annotate(
                about("The question this topic puts to the study, in plain words, for the aspect and subject."),
            ),
        }).annotate(
            about("One question the study answers with a fact: what it is about, which aspect, and the question."),
        ),
    ).annotate(about("Every topic the study answers, each once.")),
    area: Schema.optionalKey(
        Schema.Struct({
            folders: Schema.Array(Schema.String).annotate(
                about("The folders of the area, relative to the source root, that the study reads."),
            ),
            files: Schema.Array(Schema.String).annotate(
                about("The files of the area, relative to the source root, that the study reads."),
            ),
        }).annotate(about("The area of a part a job reads, for a part too large for one job.")),
    ).annotate(about("Only on an area job: the folders and files it reads.")),
}).annotate(about("What one study is given: each topic it answers, and for an area job the area it reads."));
