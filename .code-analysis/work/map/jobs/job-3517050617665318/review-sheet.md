# Review sheet: the code of PolicyPlus/AdmlFile.vb and 12 more files

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- link-29493351843535689744
- link-52743051083063376786
- link-35477415573550350665
- link-13567351271766445718
- link-84342376267637767594
- link-07843038912050430367
- link-59729911581345558415
- link-62643357327062799483
- link-01816250691817364116
- link-70956400970611183206
- link-64199986519503566575
- link-67886741591409790152
- link-69388110210560506425
- link-91256955318555826901
- link-86022197679497655805
- link-33343730841246170336
- link-97272548983230456127
- link-33634214170037920202
- link-76416729022109214683
- link-95106088207665339104
- link-26207505175740618234
- link-53401940626881526746

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/AdmlFile.vb:36-36
PolicyPlus/AdmlFile.vb:112-112
PolicyPlus/AdmxBundle.vb:222-222
PolicyPlus/AdmxBundle.vb:249-249
PolicyPlus/AdmxBundle.vb:252-252
PolicyPlus/AdmxFile.vb:28-28
PolicyPlus/AdmxFile.vb:72-72
PolicyPlus/AdmxFile.vb:85-85
PolicyPlus/AdmxFile.vb:112-112
PolicyPlus/AdmxFile.vb:258-258
PolicyPlus/CmtxFile.vb:21-21
PolicyPlus/CmtxFile.vb:30-30
PolicyPlus/CmtxFile.vb:40-40
PolicyPlus/CmtxFile.vb:57-57
PolicyPlus/CmtxFile.vb:60-61
PolicyPlus/CmtxFile.vb:69-69
PolicyPlus/CmtxFile.vb:71-71
PolicyPlus/CmtxFile.vb:74-74
PolicyPlus/CmtxFile.vb:93-93
PolicyPlus/CmtxFile.vb:102-102
PolicyPlus/CmtxFile.vb:113-113

## Read besides the findings
- the rules for a block, and the facts on the parts and technologies the lines touch: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/jobs/job-3517050617665318/brief.json
- the code kinds, layers and external systems to choose from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/registries/registry.jsonl

## What this stage's findings are known for
# Review checklist: The Map

Every flow is followed along these records, from an entry point until another entry point or an external system ends it; a finding that is false, or missing, moves or ends a flow. A block claims its whole lines, from its declaration to its end, and its code kind; a link claims both its ends, so a challenge to one cites a line of each; an entry point claims its purpose and title; a data definition claims each field as declared.

An entry point is where control or data enters the system's code from something that is not that code's own flow: a host, framework, scheduler, runtime or another process calls it, including a handler a person triggers. The test is who starts it and whether we hold the starter's source: code we hold that starts it makes it a step of that code's flow, and a starter we do not hold makes it an entry point.

## Wrong

- An entry point on code the system's own code starts (for example a procedure the application runs, a handler it calls): it cuts that code's flow short.
- A block given a code kind whose `membershipRule` its lines do not meet, or one another code kind's `membershipRule` admits as well; a new code kind where an entry of the registry does fit, or one named as an entry is; a block whose name is not on its declaration line; a container listed as a block; two blocks sharing their lines, or overlapping without one holding the other.
- A link whose target does not answer the reaching by the brief's rules, of the wrong kind, whose lines start outside the job, or sent from a shared helper to every target it could reach where the call site that decides the target is in the job's lines; a save sent to the wrong external system, or a new external system where an entry of the registry fits; a link from a list of files to build or package (a project or solution file naming its sources), which says what is compiled, not where work goes.
- A link to an external system for a name the code uses to start work elsewhere (a command name, a topic, an address) when a definition of that name is in scope: it names a line inside each such definition (a file `find-files-in-scope.ts` does not list is not in scope).
- A link of kind `call`, `reads` or `saves` that starts inside a `DataDefinition`: a shape holds no behaviour, so lines that name where work goes are a block (navigation links from data are the exception).
- A `dispatches` link written at a call site, pointing from a block that is not the stand-in, or guessed where the code does not show the stand-in; an interface or abstract member written as a container, so that no link can reach it.
- A `unresolvedTarget` where a search of the code settles the target.
- An entry point's `purpose` or `reachedBy` its lines do not show, or written with ids or internal terms (for example block, link, entry point) a reader would not follow.
- A screen layout whose controls are not the fields of one `DataDefinition` named for the screen (the `container` of its handlers), a control missing from it, or a caption or limit not as the layout sets it.
- A `DataDefinition` whose lines do not declare one shape, a field not declared as written, a `declares` its lines do not name.
- `fieldsUsed` its own lines do not name (for example a service's members, variables or parameters).

## Missing

- A block that overrides or implements a member, with its declaration in the job's lines, and no `dispatches` link to that member; a member declared without a body and called from the job's lines, with no block.
- A block, or a place where work leaves the job's lines, with no link; a target decided at run time reached from the job's lines with no link, what a mapping run misses most (for example implementations, listeners, registrations and configuration that name code reached from these lines).
- An entry point the brief's rules admit, a shape of data in any layer, a call into code with no source in scope, or a navigation or permission rule, starting in the job's lines with no record.
- A `Span` named as comments, imports or configuration over lines that hold code that runs: a missed block.


## The links of the job: the line that makes each and the line it reaches
link-41894439033333598947 (call) PolicyPlus/AdmlFile.vb:13-13: Dim adml As New AdmlFile  ->  PolicyPlus/AdmlFile.vb:9: Private Sub New()
link-69237732268917719624 (reads) PolicyPlus/AdmlFile.vb:16-18: xmlDoc.Load(File)  ->  external-63331664788166948123 policyDefinitionResources
link-92311687196742576466 (reads) PolicyPlus/AdmlFile.vb:29-36: Dim stringTableList = xmlDoc.GetElementsByTagName("stringTable")  ->  external-63331664788166948123 stringTable
link-30051663073754985445 (reads) PolicyPlus/AdmlFile.vb:40-112: Dim presTableList = xmlDoc.GetElementsByTagName("presentationTable")  ->  external-63331664788166948123 presentationTable
link-93304630291757628637 (call) PolicyPlus/AdmlFile.vb:56-56: decTextPart.DefaultValue = AttributeOrDefault(uiElement, "defaultValue", 1)  ->  PolicyPlus/XmlExtensions.vb:9: <Extension> Public Function AttributeOrDefault(Node As XmlNode, Attribute As String, DefaultVal As Object) As Object
link-36609064234199672037 (call) PolicyPlus/AdmlFile.vb:94-94: dropPart.DefaultItemID = AttributeOrNull(uiElement, "defaultItem")  ->  PolicyPlus/XmlExtensions.vb:6: <Extension> Public Function AttributeOrNull(Node As XmlNode, Attribute As String) As String
link-57958975734804981494 (saves) PolicyPlus/AdmlFile.vb:45-45: Dim presentation As New Presentation  ->  PolicyPlus/PresentationStructures.vb:2: Public Class Presentation
link-03451748958130515646 (saves) PolicyPlus/AdmlFile.vb:51-51: Dim textPart As New LabelPresentationElement  ->  PolicyPlus/PresentationStructures.vb:10: Public Class LabelPresentationElement ' <text>
link-67009487964544726014 (saves) PolicyPlus/AdmlFile.vb:55-55: Dim decTextPart As New NumericBoxPresentationElement  ->  PolicyPlus/PresentationStructures.vb:14: Public Class NumericBoxPresentationElement ' <decimalTextBox>
link-50964293227207117185 (saves) PolicyPlus/AdmlFile.vb:62-62: Dim textPart As New TextBoxPresentationElement  ->  PolicyPlus/PresentationStructures.vb:21: Public Class TextBoxPresentationElement ' <textBox>
link-24627661360896728076 (saves) PolicyPlus/AdmlFile.vb:73-73: Dim checkPart As New CheckBoxPresentationElement  ->  PolicyPlus/PresentationStructures.vb:26: Public Class CheckBoxPresentationElement ' <checkBox>
link-18920906494410463916 (saves) PolicyPlus/AdmlFile.vb:78-78: Dim comboPart As New ComboBoxPresentationElement  ->  PolicyPlus/PresentationStructures.vb:31: Public Class ComboBoxPresentationElement ' <comboBox>
link-74154266956993740352 (saves) PolicyPlus/AdmlFile.vb:92-92: Dim dropPart As New DropDownPresentationElement  ->  PolicyPlus/PresentationStructures.vb:38: Public Class DropDownPresentationElement ' <dropdownList>
link-68151098428711865579 (saves) PolicyPlus/AdmlFile.vb:98-98: Dim listPart As New ListPresentationElement  ->  PolicyPlus/PresentationStructures.vb:44: Public Class ListPresentationElement ' <listBox>
link-47122166943841690650 (saves) PolicyPlus/AdmlFile.vb:102-102: Dim multiTextPart As New MultiTextPresentationElement  ->  PolicyPlus/PresentationStructures.vb:48: Public Class MultiTextPresentationElement ' <multiTextBox>
link-01022177766789882590 (reads) PolicyPlus/AdmxBundle.vb:20-20: For Each file In Directory.EnumerateFiles(Path)  ->  external-63331664788166948123 Directory.EnumerateFiles(Path)
link-90498572456862049089 (call) PolicyPlus/AdmxBundle.vb:22-22: Dim fail = AddSingleAdmx(file, LanguageCode)  ->  PolicyPlus/AdmxBundle.vb:35: ' Load ADMX file [a comment]
link-40350317085917635587 (call) PolicyPlus/AdmxBundle.vb:26-26: BuildStructures()  ->  PolicyPlus/AdmxBundle.vb:81: Dim catIds As New Dictionary(Of String, PolicyPlusCategory)
link-04688759957183484285 (call) PolicyPlus/AdmxBundle.vb:30-30: Dim fail = AddSingleAdmx(Path, LanguageCode)  ->  PolicyPlus/AdmxBundle.vb:35: ' Load ADMX file [a comment]
link-96767415521595657662 (call) PolicyPlus/AdmxBundle.vb:31-31: BuildStructures()  ->  PolicyPlus/AdmxBundle.vb:81: Dim catIds As New Dictionary(Of String, PolicyPlusCategory)
link-01216350746898244900 (call) PolicyPlus/AdmxBundle.vb:38-38: admx = AdmxFile.Load(AdmxPath)  ->  PolicyPlus/AdmxFile.vb:15: ' ADMX documentation: https://technet.microsoft.com/en-us/library/cc772138(v=ws.10).aspx [a comment]
link-55299724245218556118 (call) PolicyPlus/AdmxBundle.vb:65-65: adml = AdmlFile.Load(admlPath)  ->  PolicyPlus/AdmlFile.vb:12: ' ADML documentation: https://technet.microsoft.com/en-us/library/cc772050(v=ws.10).aspx [a comment]
link-25448144073964238973 (call) PolicyPlus/AdmxBundle.vb:40-40: Return New AdmxLoadFailure(AdmxLoadFailType.BadAdmxParse, AdmxPath, ex.Message)  ->  PolicyPlus/AdmxBundle.vb:244: Me.FailType = FailType
link-58825182960897581706 (call) PolicyPlus/AdmxBundle.vb:42-42: Return New AdmxLoadFailure(AdmxLoadFailType.BadAdmx, AdmxPath, ex.Message)  ->  PolicyPlus/AdmxBundle.vb:244: Me.FailType = FailType
link-11984384190432334027 (call) PolicyPlus/AdmxBundle.vb:44-44: If Namespaces.ContainsKey(admx.AdmxNamespace) Then Return New AdmxLoadFailure(AdmxLoadFailType.DuplicateNamespace, AdmxPath, admx.AdmxNamespace)  ->  PolicyPlus/AdmxBundle.vb:244: Me.FailType = FailType
link-05067236627673230488 (call) PolicyPlus/AdmxBundle.vb:67-67: Return New AdmxLoadFailure(AdmxLoadFailType.BadAdmlParse, AdmxPath, ex.Message)  ->  PolicyPlus/AdmxBundle.vb:244: Me.FailType = FailType
link-65035759941528623984 (call) PolicyPlus/AdmxBundle.vb:69-69: Return New AdmxLoadFailure(AdmxLoadFailType.BadAdml, AdmxPath, ex.Message)  ->  PolicyPlus/AdmxBundle.vb:244: Me.FailType = FailType
link-42958565975306774230 (call) PolicyPlus/AdmxBundle.vb:62-62: If Not File.Exists(admlPath) Then Return New AdmxLoadFailure(AdmxLoadFailType.NoAdml, AdmxPath)  ->  PolicyPlus/AdmxBundle.vb:249: MyClass.New(FailType, AdmxPath, "")
link-41326094562221961019 (reads) PolicyPlus/AdmxBundle.vb:46-61: Dim fileTitle = Path.GetFileName(AdmxPath)  ->  external-63331664788166948123 admlPath
link-01142937493656707570 (reads) PolicyPlus/AdmxBundle.vb:72-75: RawCategories.AddRange(admx.Categories)  ->  PolicyPlus/AdmxFile.vb:2: Public Class AdmxFile
link-38462824831555396316 (saves) PolicyPlus/AdmxBundle.vb:72-77: RawCategories.AddRange(admx.Categories)  ->  PolicyPlus/AdmxBundle.vb:2: Public Class AdmxBundle
link-09084347878318511275 (call) PolicyPlus/AdmxBundle.vb:85-87: Dim findCatById = Function(UID As String) FindInTempOrFlat(UID, catIds, FlatCategories)  ->  PolicyPlus/AdmxBundle.vb:184: ' Get the best available structure for an ID [a comment]
link-26778454198199567179 (call) PolicyPlus/AdmxBundle.vb:91-92: cat.DisplayName = ResolveString(rawCat.DisplayCode, rawCat.DefinedIn)  ->  PolicyPlus/AdmxBundle.vb:194: ' Find a localized string from a display code [a comment]
link-51489524016249258972 (call) PolicyPlus/AdmxBundle.vb:122-122: If rawPol.PresentationID <> "" Then pol.Presentation = ResolvePresentation(rawPol.PresentationID, rawPol.DefinedIn)  ->  PolicyPlus/AdmxBundle.vb:202: ' Find a presentation from a code [a comment]
link-16391645046322292466 (call) PolicyPlus/AdmxBundle.vb:93-93: cat.UniqueID = QualifyName(rawCat.ID, rawCat.DefinedIn)  ->  PolicyPlus/AdmxBundle.vb:209: Return Admx.AdmxNamespace & ":" & ID
link-33473983551060981478 (call) PolicyPlus/AdmxBundle.vb:130-130: Dim parentCatName = ResolveRef(cat.RawCategory.ParentID, cat.RawCategory.DefinedIn)  ->  PolicyPlus/AdmxBundle.vb:212: ' Get a fully qualified name from a code and the current scope [a comment]
link-10279133728737840587 (reads) PolicyPlus/AdmxBundle.vb:89-89: For Each rawCat In RawCategories  ->  PolicyPlus/AdmxStructures.vb:33: Public Class AdmxCategory
link-72573214083410972815 (reads) PolicyPlus/AdmxBundle.vb:97-97: For Each rawProduct In RawProducts  ->  PolicyPlus/AdmxStructures.vb:2: Public Class AdmxProduct
link-05431641803253530051 (reads) PolicyPlus/AdmxBundle.vb:104-104: For Each rawSup In RawSupport  ->  PolicyPlus/AdmxStructures.vb:15: Public Class AdmxSupportDefinition
link-06256786815568661054 (reads) PolicyPlus/AdmxBundle.vb:109-109: For Each rawSupEntry In rawSup.Entries  ->  PolicyPlus/AdmxStructures.vb:27: Public Class AdmxSupportEntry
link-25312490905256446454 (reads) PolicyPlus/AdmxBundle.vb:118-118: For Each rawPol In RawPolicies  ->  PolicyPlus/AdmxStructures.vb:40: Public Class AdmxPolicy
link-01940210682540899653 (saves) PolicyPlus/AdmxBundle.vb:90-90: Dim cat As New PolicyPlusCategory  ->  PolicyPlus/CompiledStructures.vb:2: Public Class PolicyPlusCategory
link-65995678189523696995 (saves) PolicyPlus/AdmxBundle.vb:98-98: Dim product As New PolicyPlusProduct  ->  PolicyPlus/CompiledStructures.vb:11: Public Class PolicyPlusProduct
link-88796879072023023420 (saves) PolicyPlus/AdmxBundle.vb:105-105: Dim sup As New PolicyPlusSupport  ->  PolicyPlus/CompiledStructures.vb:18: Public Class PolicyPlusSupport
link-56985529513546164919 (saves) PolicyPlus/AdmxBundle.vb:110-110: Dim supEntry As New PolicyPlusSupportEntry  ->  PolicyPlus/CompiledStructures.vb:24: Public Class PolicyPlusSupportEntry
link-10681132905874098242 (saves) PolicyPlus/AdmxBundle.vb:119-119: Dim pol As New PolicyPlusPolicy  ->  PolicyPlus/CompiledStructures.vb:29: Public Class PolicyPlusPolicy
link-95008430164971495610 (saves) PolicyPlus/AdmxBundle.vb:163-176: For Each cat In catIds  ->  PolicyPlus/AdmxBundle.vb:2: Public Class AdmxBundle
link-19182535771292540621 (reads) PolicyPlus/AdmxBundle.vb:198-198: Dim dict = SourceFiles(Admx).StringTable  ->  PolicyPlus/AdmlFile.vb:2: Public Class AdmlFile
link-08636605591257502663 (reads) PolicyPlus/AdmxBundle.vb:205-205: Dim dict = SourceFiles(Admx).PresentationTable  ->  PolicyPlus/AdmlFile.vb:2: Public Class AdmlFile
link-38881187587961748404 (reads) PolicyPlus/AdmxBundle.vb:209-209: Return Admx.AdmxNamespace & ":" & ID  ->  PolicyPlus/AdmxFile.vb:2: Public Class AdmxFile
link-38351011908846326989 (reads) PolicyPlus/AdmxBundle.vb:215-216: If Admx.Prefixes.ContainsKey(parts(0)) Then  ->  PolicyPlus/AdmxFile.vb:2: Public Class AdmxFile
link-88455527825872959263 (call) PolicyPlus/AdmxFile.vb:16-16: Dim admx As New AdmxFile  ->  PolicyPlus/AdmxFile.vb:12: Private Sub New()
link-95281116526666270536 (reads) PolicyPlus/AdmxFile.vb:18-20: Dim xmlDoc As New XmlDocument  ->  external-63331664788166948123 policyDefinitions
link-96799772757427743495 (call) PolicyPlus/AdmxFile.vb:106-106: category.ExplainCode = categoryElement.AttributeOrNull("explainText")  ->  PolicyPlus/XmlExtensions.vb:6: <Extension> Public Function AttributeOrNull(Node As XmlNode, Attribute As String) As String
link-35583267505717788453 (call) PolicyPlus/AdmxFile.vb:201-201: decimalEntry.Minimum = AttributeOrDefault(uiElement, "minValue", 0)  ->  PolicyPlus/XmlExtensions.vb:9: <Extension> Public Function AttributeOrDefault(Node As XmlNode, Attribute As String, DefaultVal As Object) As Object
link-10471900164765032164 (saves) PolicyPlus/AdmxFile.vb:39-39: Dim definition As New AdmxSupportDefinition  ->  PolicyPlus/AdmxStructures.vb:15: Public Class AdmxSupportDefinition
link-62491792453229508666 (saves) PolicyPlus/AdmxFile.vb:57-57: definition.Entries.Add(New AdmxSupportEntry With {.ProductID = product, .IsRange = False})  ->  PolicyPlus/AdmxStructures.vb:27: Public Class AdmxSupportEntry
link-78828205594126524741 (saves) PolicyPlus/AdmxFile.vb:79-79: Dim product As New AdmxProduct  ->  PolicyPlus/AdmxStructures.vb:2: Public Class AdmxProduct
link-90781450598444814146 (saves) PolicyPlus/AdmxFile.vb:103-103: Dim category As New AdmxCategory  ->  PolicyPlus/AdmxStructures.vb:33: Public Class AdmxCategory
link-97193627884488045164 (saves) PolicyPlus/AdmxFile.vb:169-169: Dim policy As New AdmxPolicy  ->  PolicyPlus/AdmxStructures.vb:40: Public Class AdmxPolicy
link-26844450745546740395 (saves) PolicyPlus/AdmxFile.vb:116-116: Dim regItem As New PolicyRegistryValue  ->  PolicyPlus/PolicyStructures.vb:12: Public Class PolicyRegistryValue ' <value>
link-39555910275338075787 (saves) PolicyPlus/AdmxFile.vb:134-134: Dim singleList As New PolicyRegistrySingleList  ->  PolicyPlus/PolicyStructures.vb:8: Public Class PolicyRegistrySingleList
link-70181914575180368028 (saves) PolicyPlus/AdmxFile.vb:139-139: Dim listEntry As New PolicyRegistryListEntry  ->  PolicyPlus/PolicyStructures.vb:17: Public Class PolicyRegistryListEntry ' <item>
link-03435650439314024065 (saves) PolicyPlus/AdmxFile.vb:153-153: Dim regList As New PolicyRegistryList  ->  PolicyPlus/PolicyStructures.vb:2: Public Class PolicyRegistryList
link-85470324039999647680 (saves) PolicyPlus/AdmxFile.vb:200-200: Dim decimalEntry As New DecimalPolicyElement  ->  PolicyPlus/PolicyStructures.vb:34: Public Class DecimalPolicyElement ' <decimal>
link-90637316356398491419 (saves) PolicyPlus/AdmxFile.vb:207-207: Dim boolEntry As New BooleanPolicyElement  ->  PolicyPlus/PolicyStructures.vb:42: Public Class BooleanPolicyElement ' <boolean>
link-04224397076984872538 (saves) PolicyPlus/AdmxFile.vb:211-211: Dim textEntry As New TextPolicyElement  ->  PolicyPlus/PolicyStructures.vb:46: Public Class TextPolicyElement ' <text>
link-73105352683396632564 (saves) PolicyPlus/AdmxFile.vb:218-218: Dim listEntry As New ListPolicyElement  ->  PolicyPlus/PolicyStructures.vb:53: Public Class ListPolicyElement ' <list>
link-92291372983768884106 (saves) PolicyPlus/AdmxFile.vb:226-226: Dim enumEntry As New EnumPolicyElement  ->  PolicyPlus/PolicyStructures.vb:60: Public Class EnumPolicyElement ' <enum>
link-10489743337995225762 (saves) PolicyPlus/AdmxFile.vb:231-231: Dim enumItem As New EnumPolicyElementItem  ->  PolicyPlus/PolicyStructures.vb:65: Public Class EnumPolicyElementItem ' <item>
link-40881460478606475604 (saves) PolicyPlus/AdmxFile.vb:245-245: entry = New MultiTextPolicyElement  ->  PolicyPlus/PolicyStructures.vb:70: Public Class MultiTextPolicyElement ' <multiText>
link-51798317301625399144 (reads) PolicyPlus/CmtxFile.vb:11-13: Dim xmlDoc As New XmlDocument  ->  external-63331664788166948123 policyComments
link-24879965240870382871 (call) PolicyPlus/CmtxFile.vb:19-19: Dim prefix = usingElement.AttributeOrNull("prefix")  ->  PolicyPlus/XmlExtensions.vb:6: <Extension> Public Function AttributeOrNull(Node As XmlNode, Attribute As String) As String
link-01581541198087048560 (call) PolicyPlus/CmtxFile.vb:20-20: Dim ns = usingElement.AttributeOrNull("namespace")  ->  PolicyPlus/XmlExtensions.vb:6: <Extension> Public Function AttributeOrNull(Node As XmlNode, Attribute As String) As String
link-27069057000811073882 (call) PolicyPlus/CmtxFile.vb:28-28: Dim policy = commentElement.AttributeOrNull("policyRef")  ->  PolicyPlus/XmlExtensions.vb:6: <Extension> Public Function AttributeOrNull(Node As XmlNode, Attribute As String) As String
link-50802514733956333861 (call) PolicyPlus/CmtxFile.vb:29-29: Dim text = commentElement.AttributeOrNull("commentText")  ->  PolicyPlus/XmlExtensions.vb:6: <Extension> Public Function AttributeOrNull(Node As XmlNode, Attribute As String) As String
link-13811052059266560837 (call) PolicyPlus/CmtxFile.vb:38-38: Dim id = stringElement.AttributeOrNull("id")  ->  PolicyPlus/XmlExtensions.vb:6: <Extension> Public Function AttributeOrNull(Node As XmlNode, Attribute As String) As String
link-25142798600780864651 (call) PolicyPlus/CmtxFile.vb:79-79: Save(SourceFile)  ->  PolicyPlus/CmtxFile.vb:82: ' Save the CMTX data to a fully compliant XML document [a comment]
link-88699826117797857802 (saves) PolicyPlus/CmtxFile.vb:122-122: xml.Save(File)  ->  external-63331664788166948123 policyComments
link-02141460978535538774 (saves) PolicyPlus/ConfigurationStorage.vb:6-6: ConfigKey = RegistryKey.OpenBaseKey(RegistryBase, RegistryView.Default).CreateSubKey(Subkey)  ->  external-76952632453450489524 Subkey
link-35035792592544626004 (reads) PolicyPlus/ConfigurationStorage.vb:12-12: If ConfigKey IsNot Nothing Then Return ConfigKey.GetValue(ValueName, DefaultValue) Else Return DefaultValue  ->  external-76952632453450489524 Subkey
link-97153293610361561449 (saves) PolicyPlus/ConfigurationStorage.vb:15-15: If ConfigKey IsNot Nothing Then ConfigKey.SetValue(ValueName, Data)  ->  external-76952632453450489524 Subkey
link-11878267935514681285 (reads) PolicyPlus/ConfigurationStorage.vb:18-18: Return ConfigKey IsNot Nothing AndAlso ConfigKey.GetValue(ValueName) IsNot Nothing  ->  external-76952632453450489524 Subkey
link-42913903458569961116 (renders) PolicyPlus/DetailAdmx.vb:19-19: ShowDialog()  ->  PolicyPlus/DetailAdmx.Designer.vb:296: Friend WithEvents TextPath As TextBox
link-16294499818511825829 (reads) PolicyPlus/DetailAdmx.vb:3-5: TextPath.Text = Admx.SourceFile  ->  PolicyPlus/AdmxFile.vb:2: Public Class AdmxFile
link-99609223578763802398 (reads) PolicyPlus/DetailAdmx.vb:15-15: fillListview(LsvPolicies, Workspace.Policies.Values.Where(Function(p) p.RawPolicy.DefinedIn Is Admx), Function(p As PolicyPlusPolicy) p.RawPolicy.ID, Function(p  ->  PolicyPlus/AdmxBundle.vb:2: Public Class AdmxBundle
link-59096701881444399723 (reads) PolicyPlus/DetailAdmx.vb:16-16: fillListview(LsvCategories, Workspace.FlatCategories.Values.Where(Function(c) c.RawCategory.DefinedIn Is Admx), Function(c As PolicyPlusCategory) c.RawCategory.  ->  PolicyPlus/AdmxBundle.vb:2: Public Class AdmxBundle
link-87200730805576163806 (reads) PolicyPlus/DetailAdmx.vb:17-17: fillListview(LsvProducts, Workspace.FlatProducts.Values.Where(Function(p) p.RawProduct.DefinedIn Is Admx), Function(p As PolicyPlusProduct) p.RawProduct.ID, Fun  ->  PolicyPlus/AdmxBundle.vb:2: Public Class AdmxBundle
link-57756223684890664530 (reads) PolicyPlus/DetailAdmx.vb:18-18: fillListview(LsvSupportDefinitions, Workspace.SupportDefinitions.Values.Where(Function(s) s.RawSupport.DefinedIn Is Admx), Function(s As PolicyPlusSupport) s.Ra  ->  PolicyPlus/AdmxBundle.vb:2: Public Class AdmxBundle
link-58137429174948563913 (reads) PolicyPlus/DetailAdmx.vb:15-15: fillListview(LsvPolicies, Workspace.Policies.Values.Where(Function(p) p.RawPolicy.DefinedIn Is Admx), Function(p As PolicyPlusPolicy) p.RawPolicy.ID, Function(p  ->  PolicyPlus/CompiledStructures.vb:29: Public Class PolicyPlusPolicy
link-83074353555653892517 (reads) PolicyPlus/DetailAdmx.vb:16-16: fillListview(LsvCategories, Workspace.FlatCategories.Values.Where(Function(c) c.RawCategory.DefinedIn Is Admx), Function(c As PolicyPlusCategory) c.RawCategory.  ->  PolicyPlus/CompiledStructures.vb:2: Public Class PolicyPlusCategory
link-74638047949524501328 (reads) PolicyPlus/DetailAdmx.vb:17-17: fillListview(LsvProducts, Workspace.FlatProducts.Values.Where(Function(p) p.RawProduct.DefinedIn Is Admx), Function(p As PolicyPlusProduct) p.RawProduct.ID, Fun  ->  PolicyPlus/CompiledStructures.vb:11: Public Class PolicyPlusProduct
link-82673460475453321584 (reads) PolicyPlus/DetailAdmx.vb:18-18: fillListview(LsvSupportDefinitions, Workspace.SupportDefinitions.Values.Where(Function(s) s.RawSupport.DefinedIn Is Admx), Function(s As PolicyPlusSupport) s.Ra  ->  PolicyPlus/CompiledStructures.vb:18: Public Class PolicyPlusSupport
link-34784585816082995898 (call) PolicyPlus/DetailAdmx.vb:22-22: DetailPolicy.PresentDialog(LsvPolicies.SelectedItems(0).Tag)  ->  PolicyPlus/DetailPolicy.vb:3: Public Sub PresentDialog(Policy As PolicyPlusPolicy)
link-63325290957553070948 (call) PolicyPlus/DetailAdmx.vb:25-25: DetailCategory.PresentDialog(LsvCategories.SelectedItems(0).Tag)  ->  PolicyPlus/DetailCategory.vb:3: Public Sub PresentDialog(Category As PolicyPlusCategory)
link-32682194151726840428 (call) PolicyPlus/DetailAdmx.vb:28-28: DetailProduct.PresentDialog(LsvProducts.SelectedItems(0).Tag)  ->  PolicyPlus/DetailProduct.vb:3: Public Sub PresentDialog(Product As PolicyPlusProduct)
link-38401954661180893320 (call) PolicyPlus/DetailAdmx.vb:31-31: DetailSupport.PresentDialog(LsvSupportDefinitions.SelectedItems(0).Tag)  ->  PolicyPlus/DetailSupport.vb:2: Public Sub PresentDialog(Supported As PolicyPlusSupport)
link-16172634920779047236 (call) PolicyPlus/DetailCategory.vb:4-4: PrepareDialog(Category)  ->  PolicyPlus/DetailCategory.vb:8: SelectedCategory = Category
link-68932935922033976782 (call) PolicyPlus/DetailCategory.vb:24-24: PrepareDialog(SelectedCategory.Parent)  ->  PolicyPlus/DetailCategory.vb:8: SelectedCategory = Category
link-35359043781689894446 (renders) PolicyPlus/DetailCategory.vb:5-5: ShowDialog()  ->  PolicyPlus/DetailCategory.Designer.vb:202: Friend WithEvents NameTextbox As TextBox
link-00958153151528998602 (reads) PolicyPlus/DetailCategory.vb:9-18: NameTextbox.Text = Category.DisplayName  ->  PolicyPlus/CompiledStructures.vb:2: Public Class PolicyPlusCategory
link-88980088804887051618 (reads) PolicyPlus/DetailCategory.vb:11-17: DefinedTextbox.Text = Category.RawCategory.DefinedIn.SourceFile  ->  PolicyPlus/AdmxStructures.vb:33: Public Class AdmxCategory
link-29493351843535689744 (saves) PolicyPlus/CmtxFile.vb:21-21: cmtx.Prefixes.Add(prefix, ns)  ->  PolicyPlus/CmtxFile.vb:2: Public Class CmtxFile
link-52743051083063376786 (saves) PolicyPlus/CmtxFile.vb:30-30: cmtx.Comments.Add(policy, text)  ->  PolicyPlus/CmtxFile.vb:2: Public Class CmtxFile
link-35477415573550350665 (saves) PolicyPlus/CmtxFile.vb:40-40: cmtx.Strings.Add(id, text)  ->  PolicyPlus/CmtxFile.vb:2: Public Class CmtxFile
link-13567351271766445718 (call) PolicyPlus/AdmxBundle.vb:252-252: Dim failMsg = "Couldn't load " & AdmxPath & ": " & GetFailMessage(FailType, Info)  ->  PolicyPlus/AdmxBundle.vb:257: Select Case FailType
link-84342376267637767594 (call) PolicyPlus/AdmxBundle.vb:249-249: MyClass.New(FailType, AdmxPath, "")  ->  PolicyPlus/AdmxBundle.vb:244: Me.FailType = FailType
link-07843038912050430367 (call) PolicyPlus/AdmxBundle.vb:222-222: Return QualifyName(Ref, Admx)  ->  PolicyPlus/AdmxBundle.vb:209: Return Admx.AdmxNamespace & ":" & ID
link-59729911581345558415 (saves) PolicyPlus/CmtxFile.vb:57-57: cmtx.Prefixes.Add(prefixId, idParts(0))  ->  PolicyPlus/CmtxFile.vb:2: Public Class CmtxFile
link-62643357327062799483 (saves) PolicyPlus/CmtxFile.vb:60-60: cmtx.Strings.Add(resourceId, kv.Value)  ->  PolicyPlus/CmtxFile.vb:2: Public Class CmtxFile
link-01816250691817364116 (saves) PolicyPlus/CmtxFile.vb:61-61: cmtx.Comments.Add(revPrefixes(idParts(0)) & ":" & idParts(1), "$(resource." & resourceId & ")")  ->  PolicyPlus/CmtxFile.vb:2: Public Class CmtxFile
link-70956400970611183206 (reads) PolicyPlus/CmtxFile.vb:69-69: For Each comment In Comments  ->  PolicyPlus/CmtxFile.vb:2: Public Class CmtxFile
link-64199986519503566575 (reads) PolicyPlus/CmtxFile.vb:71-71: Dim polNamespace = Prefixes(refParts(0))  ->  PolicyPlus/CmtxFile.vb:2: Public Class CmtxFile
link-67886741591409790152 (reads) PolicyPlus/CmtxFile.vb:74-74: commentTable.Add(polNamespace & ":" & refParts(1), Strings(stringId))  ->  PolicyPlus/CmtxFile.vb:2: Public Class CmtxFile
link-69388110210560506425 (reads) PolicyPlus/CmtxFile.vb:93-93: For Each prefix In Prefixes  ->  PolicyPlus/CmtxFile.vb:2: Public Class CmtxFile
link-91256955318555826901 (reads) PolicyPlus/CmtxFile.vb:102-102: For Each comment In Comments  ->  PolicyPlus/CmtxFile.vb:2: Public Class CmtxFile
link-86022197679497655805 (reads) PolicyPlus/CmtxFile.vb:113-113: For Each textval In Strings  ->  PolicyPlus/CmtxFile.vb:2: Public Class CmtxFile
link-33343730841246170336 (saves) PolicyPlus/AdmxFile.vb:28-28: admx.Prefixes.Add(prefix, fqNamespace)  ->  PolicyPlus/AdmxFile.vb:2: Public Class AdmxFile
link-97272548983230456127 (saves) PolicyPlus/AdmxFile.vb:72-72: admx.SupportedOnDefinitions.Add(definition)  ->  PolicyPlus/AdmxFile.vb:2: Public Class AdmxFile
link-33634214170037920202 (saves) PolicyPlus/AdmxFile.vb:85-85: admx.Products.Add(product)  ->  PolicyPlus/AdmxFile.vb:2: Public Class AdmxFile
link-76416729022109214683 (saves) PolicyPlus/AdmxFile.vb:112-112: admx.Categories.Add(category)  ->  PolicyPlus/AdmxFile.vb:2: Public Class AdmxFile
link-95106088207665339104 (saves) PolicyPlus/AdmxFile.vb:258-258: admx.Policies.Add(policy)  ->  PolicyPlus/AdmxFile.vb:2: Public Class AdmxFile
link-26207505175740618234 (saves) PolicyPlus/AdmlFile.vb:36-36: adml.StringTable.Add(key, value)  ->  PolicyPlus/AdmlFile.vb:2: Public Class AdmlFile
link-53401940626881526746 (saves) PolicyPlus/AdmlFile.vb:112-112: adml.PresentationTable.Add(presentation.Name, presentation)  ->  PolicyPlus/AdmlFile.vb:2: Public Class AdmlFile
