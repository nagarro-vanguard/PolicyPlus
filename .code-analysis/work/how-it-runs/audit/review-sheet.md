# Review sheet: the stage audit

## The lines of the job: your receipt lists the ranges you read
COMPILE.md:1-16
PolicyPlus/AdmlFile.vb:11-11
PolicyPlus/AdmxFile.vb:14-14
PolicyPlus/AdmxFile.vb:115-141
PolicyPlus/AdmxStructures.vb:2-55
PolicyPlus/App.config:1-5
PolicyPlus/CmtxFile.vb:7-7
PolicyPlus/CmtxFile.vb:78-81
PolicyPlus/CompiledStructures.vb:2-29
PolicyPlus/ConfigurationStorage.vb:1-20
PolicyPlus/DownloadAdmx.vb:1-7
PolicyPlus/DownloadAdmx.vb:14-18
PolicyPlus/DownloadAdmx.vb:22-28
PolicyPlus/DownloadAdmx.vb:33-34
PolicyPlus/DownloadAdmx.vb:37-50
PolicyPlus/DownloadAdmx.vb:52-111
PolicyPlus/DownloadAdmx.vb:114-114
PolicyPlus/DownloadAdmx.vb:116-121
PolicyPlus/DownloadAdmx.vb:123-127
PolicyPlus/EditSetting.vb:19-21
PolicyPlus/FindResults.vb:95-98
PolicyPlus/Main.Designer.vb:1-24
PolicyPlus/Main.Designer.vb:31-33
PolicyPlus/Main.Designer.vb:706-708
PolicyPlus/Main.vb:5-16
PolicyPlus/Main.vb:18-60
PolicyPlus/Main.vb:303-330
PolicyPlus/Main.vb:478-478
PolicyPlus/Main.vb:480-507
PolicyPlus/Main.vb:510-515
PolicyPlus/Main.vb:517-517
PolicyPlus/Main.vb:602-609
PolicyPlus/Main.vb:615-637
PolicyPlus/Main.vb:683-683
PolicyPlus/Main.vb:685-687
PolicyPlus/Main.vb:758-762
PolicyPlus/Main.vb:809-809
PolicyPlus/OpenPol.vb:80-102
PolicyPlus/OpenUserRegistry.vb:6-12
PolicyPlus/PInvoke.vb:1-13
PolicyPlus/PInvoke.vb:15-23
PolicyPlus/PolicyLoader.vb:18-19
PolicyPlus/PolicyLoader.vb:21-32
PolicyPlus/PolicyLoader.vb:40-42
PolicyPlus/PolicyLoader.vb:49-116
PolicyPlus/PolicyLoader.vb:119-147
PolicyPlus/PolicyLoader.vb:179-197
PolicyPlus/PolicyPlus.vbproj:5-41
PolicyPlus/PolicyPlus.vbproj:55-55
PolicyPlus/PolicyPlus.vbproj:58-63
PolicyPlus/PolicyPlus.vbproj:322-322
PolicyPlus/PolicyPlus.vbproj:326-328
PolicyPlus/PolicyPlus.vbproj:420-424
PolicyPlus/PolicyProcessing.vb:1-2
PolicyPlus/PolicySource.vb:3-20
PolicyPlus/PolicySource.vb:374-379
PolicyPlus/PolicySource.vb:391-398
PolicyPlus/PolicySource.vb:428-433
PolicyPlus/PolicyStructures.vb:2-17
PolicyPlus/PresentationStructures.vb:2-48
PolicyPlus/Privilege.vb:2-15
PolicyPlus/RegFile.vb:117-117
PolicyPlus/SpolFile.vb:1-1
PolicyPlus/SystemInfo.vb:1-1
PolicyPlus/SystemInfo.vb:3-11
README.md:1-12
README.md:30-35
version.bat:1-8

## Read besides the findings
- the pages the person reads: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/pages
- the catalogue: /Users/anupvasudeva/me/projects/PolicyPlus/.agents/skills/code-analysis/shared/catalogue

## What this stage's findings are known for
# Review checklist: a whole stage

Every accepted record of the stage is in front of you, written by many jobs that never saw each other. Each was reviewed on its own; what is wrong only when they are read together is yours. The person reads them through the pages.

## Wrong

- Two records that contradict each other, from one job or two: challenge the one the code shows false, citing the other's lines, and leave the other as it stands.
- An answer that rests on facts but drops a condition, an exception or a part they state, or states of every part what holds of one.
- An answer resting on a fact that is itself wrong: challenge the fact, where the error starts.
- One harm told several times as if they were several, or one told at different severities by different writers.
- A statement a person could not follow without the code open, or one that reads as more certain than its basis.

## Missing

- A harm the code plainly shows that no record of the stage carries, wherever it sits, whichever question it falls under or none.
- A question the stage's records answer for some parts and leave silent for others where the code answers it.
- A decision the person must make that the pages never put to them, or a page that does not say what matters most.

