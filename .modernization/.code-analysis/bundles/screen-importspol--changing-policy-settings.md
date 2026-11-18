# Screen: Import policy settings text, as Changing policy settings

At a glance: 5 owned rules, 10 relied on, 7 actions, 4 files (1 own, 2 relied on, 1 of neighbour screens, 0 generated), 2 disputed.

How to read it: paths are relative to the source root and `file:a-b` is an inclusive line range. `BR-` rules, `ACT-` actions, `TR-` changes of state and `RK-` risks have stable ids. A record marked disputed was challenged in review and kept; the reviewer's words are under Trust. All of it was read from the code; nothing was run.

## Product context
Policy Plus is a Windows desktop editor for Group Policy settings, used by administrators and power users. It reads Microsoft's policy definition files and edits policy files directly, so it works on any Windows edition, including Home, which lacks the built-in editor.
Built with: .NET Framework v4.5.2, Microsoft Windows, System.DirectoryServices, System.Xml, Visual Basic .NET, Windows Forms (Policy Plus desktop editor).
Runs: It runs on the user's own Windows computer as one desktop program on .NET Framework 4.5.2. It asks for elevated rights when available but starts without them; loading registry hives, refreshing policy and editing local Group Policy files need them. It can also reach the domain's shared policy folder.
Reaches outside itself: Computer file system folders; Windows registry policy keys and loaded user hives; Administrative template files (ADMX and ADML); Windows registry settings key of Policy Plus; Generated version source file; Policy comment files (CMTX); Active Directory domain; Microsoft download site.

```mermaid
flowchart LR
  L0["Build tooling"]
  L1["Dialog windows and their reactions"]:::hit
  L2["Policy definitions and files"]:::hit
  L3["Program setup and settings"]
  L1 -->|"call, reads"| L2
  L1 -->|"call"| L3
  X0[("Computer file system folders")]
  L2 -.->|"reads, saves"| X0
  L1 -.->|"reads, saves"| X0
  X1[("Windows registry policy keys and loaded user hives")]
  L2 -.->|"reads, saves"| X1
  L1 -.->|"reads"| X1
  X2[("Administrative template files ADMX and ADML")]
  L2 -.->|"reads"| X2
  X3[("Windows registry settings key of Policy Plus")]
  L3 -.->|"reads, saves"| X3
  X4[("Generated version source file")]
  L0 -.->|"saves"| X4
  L1 -.->|"reads"| X4
  X5[("Policy comment files CMTX")]
  L2 -.->|"reads, saves"| X5
  X6[("Active Directory domain")]
  L1 -.->|"call"| X6
  X7[("Microsoft download site")]
  L1 -.->|"request"| X7
  classDef hit fill:#fde68a,stroke:#b45309,color:#1f2937
```

## Where this sits
Part of: Changing policy settings (Setting and storing policies).

```mermaid
flowchart LR
  E0[("Policy setting")]
  S0["Import policy settings text, as Changing policy settings"]:::hit
  P0["Policy Plus main window"] -->|"opens"| S0
  S0 -.->|"reads"| E0
  C0(["Changing policy settings"])
  C0 --- S0
  classDef hit fill:#fde68a,stroke:#b45309,color:#1f2937
```

## Boundary
- Opened by **Policy Plus main window** (bundle: screen policy-plus-main-window), at `PolicyPlus/Main.vb:707-719`

## Contract: what it must do
### Import policy settings text
Load or paste SPOL text, check it and apply it.
Controls (6): Both, TabIndex = 2: TextSpol; Button, Text = "Apply", TabIndex = 4: ButtonApply; Button, Text = "Open File", TabIndex = 0: ButtonOpenFile; Button, Text = "Reset", TabIndex = 1: ButtonReset; Button, Text = "Verify", TabIndex = 3: ButtonVerify; Label, Text = "Semantic Policy (SPOL) text", TabIndex = 1: Label1

Actions
- **ACT-09856376** Lets the person pick a SPOL file and shows its text for editing. — `PolicyPlus/ImportSpol.vb:3-10`; started by person
- **ACT-19360952** Checks the SPOL text and reports how many policy settings it holds. — `PolicyPlus/ImportSpol.vb:11-18`; started by person
- **ACT-30091312** Parses the SPOL text and hands it back to the caller to apply, or reports it as invalid. — `PolicyPlus/ImportSpol.vb:19-26`; started by person
- **ACT-03600855** Clears any earlier SPOL result. — `PolicyPlus/ImportSpol.vb:27-29`; started by person
- **ACT-01467584** Closes the window as cancelled when Escape is pressed and no text is selected. — `PolicyPlus/ImportSpol.vb:30-32`; started by person
- **ACT-21641067** Selects all text in the box on Ctrl+A. — `PolicyPlus/ImportSpol.vb:33-35`; started by person
- **ACT-01531941** After confirmation, replaces the SPOL text with the empty header. — `PolicyPlus/ImportSpol.vb:36-40`; started by person

Rules
- **BR-99057081** Open File puts the whole chosen file into the text box, replacing what was typed without asking and without checking it; Reset, after a Yes to "Are you sure you want to reset the text box?", restores the header "Policy Plus Semantic Policy" and blank lines. — `PolicyPlus/ImportSpol.vb:3-10`; also rests on `PolicyPlus/ImportSpol.vb:36-40`; **disputed**
- **BR-29172869** Verify reads the SPOL text and reports "Validation successful, N policy settings found." or "SPOL validation failed: " followed by the reason; nothing is applied. — `PolicyPlus/ImportSpol.vb:11-18`
- **BR-27150580** Apply accepts only SPOL text that reads correctly; the parsed file is passed back to the main window. Invalid text is refused with "The SPOL text is invalid: " and the reason. — `PolicyPlus/ImportSpol.vb:19-26`
- **BR-38807522** Opening Import SPOL discards any previously parsed SPOL so a cancelled session passes nothing back. — `PolicyPlus/ImportSpol.vb:27-29`
- **BR-74126677** Pressing Escape closes Import SPOL as cancelled unless text in the box is selected; when it is, Escape closes nothing. — `PolicyPlus/ImportSpol.vb:30-32`


## Relied on: decided elsewhere
**Code shared with a few capabilities**
- `PolicyPlus/SpolFile.vb`
  - **BR-69713399** When a semantic policy script fails to load, the error gives the line it stopped at, in the form '(Error found on line N.)'. — `PolicyPlus/SpolFile.vb:6-11`; also rests on `PolicyPlus/SpolFile.vb:17-21`
  - **BR-45160893** A semantic policy script is read in lines separated by carriage return and line feed. … — `PolicyPlus/SpolFile.vb:15`
  - **BR-27114950** A semantic policy script is refused unless its first line is 'Policy Plus Semantic Policy', with the message 'Incorrect signature.'. — `PolicyPlus/SpolFile.vb:50`
  - **BR-66938318** A policy header line in a semantic policy script is a user policy only when its first word is exactly 'U'. … — `PolicyPlus/SpolFile.vb:53-55`
  - **BR-57610465** A comment line in a semantic policy script is recognised without regard to letter case. … — `PolicyPlus/SpolFile.vb:56-71`
  - **BR-72173436** A comment in a semantic policy script is refused when it ends with a lone backslash, with the message 'Escape sequence started at end of comment.'. … — `PolicyPlus/SpolFile.vb:62-70`
  - **BR-06118840** The state in a semantic policy script must be 'Not configured', 'Enabled' or 'Disabled', regardless of case. … — `PolicyPlus/SpolFile.vb:78-87`
  - **BR-77971913** Settings are read only for a policy that is Enabled. … — `PolicyPlus/SpolFile.vb:88-123`
  - **BR-65491468** A setting value in a semantic policy script is read in this order. … — `PolicyPlus/SpolFile.vb:93-120`
  - **BR-49767580** A bracketed setting in a semantic policy script holds one line per entry. … — `PolicyPlus/SpolFile.vb:105-117`; also rests on `PolicyPlus/PolicyProcessing.vb:301-305`, `PolicyPlus/PolicyProcessing.vb:328-331`; **disputed**


## Data and states
- Policy setting: reads; kept in Computer file system folders, Windows registry policy keys and loaded user hives

Life of Policy setting
```mermaid
stateDiagram-v2
  direction LR
  state "Not configured" as s1
  state "Enabled" as s2
  state "Disabled" as s3
  state "Unclear" as s4
  [*] --> s1 : TR-88587247
```

| Change | From | To | Written at | In this code | Reading |
| --- | --- | --- | --- | --- | --- |
| TR-88587247 | created | Not configured | `PolicyPlus/PolicyLoader.vb:94-100` | no | corrected |

## Trust: what to doubt
**Challenged in review and kept**
- **BR-99057081** `PolicyPlus/ImportSpol.vb:3-10`: Two decisions in one rule, and the second is owned by the wrong block: Open File (3-10) and Reset (36-40, a block of its own, given here only as evidence). Split into a rule for Open File decided at 3-10 (whole file replaces typed text without asking) and a rule for Reset decided at 36-40 (needs a Yes to the question, then restores the header). 'Without checking it' is the weakness in fact-44356108302568422603; do not repeat it inside the rule.
- **BR-49767580** `PolicyPlus/SpolFile.vb:105-117`: 'For any other kind of setting the empty value makes the write fail' is not shown for every kind. The project is built with Option Strict Off (PolicyPlus.vbproj line 49), so the stored Nothing is converted loosely: a number setting not stored as text goes through CUInt(Nothing) (line 312) and writes 0; a checkbox takes Nothing as unticked (316), saving its off state; a dropdown indexes its items with Nothing (349), which converts to position 0 and picks the first item. Only text-type and multi-line settings visibly hand Nothing to the writer (310, 327, 353), and whether that fails is decided in the POL/registry writer, not here. State what the person ends up with per kind (list: entries cleared unless others are kept; number, checkbox, dropdown: a default value is written), or limit the claim to what the lines prove.

**Risks**
- **RK-55878738** [low] Several windows raise an unhandled error on ordinary input: double-clicking with no row selected, right-clicking with no category, an unnamed list entry, an unreadable import file, a malformed search wildcard, a removed product in a filter, or an inspector item with no match. No program-wide handler is set, so the framework's default error dialog appears. (Failures are hidden, lost or not retried) — at `PolicyPlus/ImportSpol.vb:3-10`


## Read order
| Tier | File | Lines | Why |
| --- | --- | --- | --- |
| own | `PolicyPlus/ImportSpol.vb` | whole file | starts 7 actions; decides 5 owned rules |
| relied on | `PolicyPlus/PolicyProcessing.vb` | 301-305, 328-331 | called code |
| relied on | `PolicyPlus/SpolFile.vb` | 4-126 | decides 10 relied-on rules; called code |
| neighbour screen | `PolicyPlus/Main.vb` | 707-719 | opens this screen: Policy Plus main window |

## Source

### PolicyPlus/ImportSpol.vb
```
1: ﻿Public Class ImportSpol
2:     Public Spol As SpolFile
3:     Private Sub ButtonOpenFile_Click(sender As Object, e As EventArgs) Handles ButtonOpenFile.Click
4:         Using ofd As New OpenFileDialog
5:             ofd.Filter = "Semantic Policy files|*.spol|All files|*.*"
6:             If ofd.ShowDialog = DialogResult.OK Then
7:                 TextSpol.Text = IO.File.ReadAllText(ofd.FileName)
8:             End If
9:         End Using
10:     End Sub
11:     Private Sub ButtonVerify_Click(sender As Object, e As EventArgs) Handles ButtonVerify.Click
12:         Try
13:             Dim spol = SpolFile.FromText(TextSpol.Text)
14:             MsgBox("Validation successful, " & spol.Policies.Count & " policy settings found.", MsgBoxStyle.Information)
15:         Catch ex As Exception
16:             MsgBox("SPOL validation failed: " & ex.Message, MsgBoxStyle.Exclamation)
17:         End Try
18:     End Sub
19:     Private Sub ButtonApply_Click(sender As Object, e As EventArgs) Handles ButtonApply.Click
20:         Try
21:             Spol = SpolFile.FromText(TextSpol.Text) ' Tell the main form that the SPOL is ready to be committed
22:             DialogResult = DialogResult.OK
23:         Catch ex As Exception
24:             MsgBox("The SPOL text is invalid: " & ex.Message, MsgBoxStyle.Exclamation)
25:         End Try
26:     End Sub
27:     Private Sub ImportSpol_Shown(sender As Object, e As EventArgs) Handles Me.Shown
28:         Spol = Nothing
29:     End Sub
30:     Private Sub ImportSpol_KeyUp(sender As Object, e As KeyEventArgs) Handles Me.KeyUp
31:         If e.KeyCode = Keys.Escape And Not (TextSpol.Focused And TextSpol.SelectionLength > 0) Then DialogResult = DialogResult.Cancel
32:     End Sub
33:     Private Sub TextSpol_KeyDown(sender As Object, e As KeyEventArgs) Handles TextSpol.KeyDown
34:         If e.KeyCode = Keys.A And e.Control Then TextSpol.SelectAll()
35:     End Sub
36:     Private Sub ButtonReset_Click(sender As Object, e As EventArgs) Handles ButtonReset.Click
37:         If MsgBox("Are you sure you want to reset the text box?", MsgBoxStyle.Question Or MsgBoxStyle.YesNo) = MsgBoxResult.Yes Then
38:             TextSpol.Text = "Policy Plus Semantic Policy" & vbCrLf & vbCrLf
39:         End If
40:     End Sub
41: End Class
```

### PolicyPlus/PolicyProcessing.vb
```
301:                 If rawpol.Elements IsNot Nothing Then ' Write the elements' states
302:                     For Each elem In rawpol.Elements
303:                         Dim elemKey = If(elem.RegistryKey = "", rawpol.RegistryKey, elem.RegistryKey)
304:                         If Not Options.ContainsKey(elem.ID) Then Continue For
305:                         Dim optionData = Options(elem.ID)
```
```
328:                             Case "list"
329:                                 Dim listElem As ListPolicyElement = elem
330:                                 If Not listElem.NoPurgeOthers Then PolicySource.ClearKey(elemKey)
331:                                 If optionData Is Nothing Then Continue For
```

### PolicyPlus/SpolFile.vb
```
4:     Public Shared Function FromText(Text As String) As SpolFile
5:         Dim spol As New SpolFile
6:         Try
7:             spol.LoadFromText(Text)
8:             Return spol
9:         Catch ex As Exception
10:             Throw New Exception(ex.Message & " (Error found on line " & spol.ParserLine & ".)")
11:         End Try
12:     End Function
13:     Private Sub LoadFromText(Text As String)
14:         ' Load a SPOL script into policy states
15:         Dim allLines = Split(Text, vbCrLf)
16:         Dim line As String = ""
17:         Dim nextLine = Function() As String
18:                            ParserLine += 1
19:                            line = allLines(ParserLine - 1) ' For human-readability in errors
20:                            Return line
21:                        End Function
22:         Dim atEnd = Function() As Boolean
23:                         Return ParserLine >= allLines.Length
24:                     End Function
25:         Dim peekLine = Function() As String
26:                            Return allLines(ParserLine) ' +1 for next, -1 for array
27:                        End Function
28:         Dim getAllStrings = Function(Splittable As String, Delimiter As Char) As List(Of String)
29:                                 Dim list As New List(Of String)
30:                                 Dim sb As Text.StringBuilder = Nothing
31:                                 For n = 0 To Splittable.Length - 1
32:                                     If Splittable(n) = Delimiter Then
33:                                         If sb Is Nothing Then
34:                                             sb = New Text.StringBuilder
35:                                         Else
36:                                             If n + 1 < Splittable.Length - 1 AndAlso Splittable(n + 1) = Delimiter Then
37:                                                 sb.Append(Delimiter)
38:                                                 n += 1
39:                                             Else
40:                                                 list.Add(sb.ToString)
41:                                                 sb = Nothing
42:                                             End If
43:                                         End If
44:                                     ElseIf sb IsNot Nothing Then
45:                                         sb.Append(Splittable(n))
46:                                     End If
47:                                 Next
48:                                 Return list
49:                             End Function
50:         If nextLine() <> "Policy Plus Semantic Policy" Then Throw New Exception("Incorrect signature.")
51:         Do Until atEnd()
52:             If Trim(nextLine()) = "" Then Continue Do
53:             Dim policyHeaderParts = Split(line, " ", 2) ' Section and policy ID
54:             Dim singlePolicy As New SpolPolicyState With {.UniqueID = policyHeaderParts(1)}
55:             singlePolicy.Section = If(policyHeaderParts(0) = "U", AdmxPolicySection.User, AdmxPolicySection.Machine)
56:             Const commentPrefix As String = "comment: "
57:             If LTrim(peekLine()).ToLowerInvariant().StartsWith(commentPrefix) Then
58:                 Dim escapedCommentText = LTrim(nextLine()).Substring(commentPrefix.Length)
59:                 Dim commentText As New Text.StringBuilder
60:                 For n = 0 To escapedCommentText.Length - 1
61:                     If escapedCommentText(n) = "\"c Then
62:                         If n = escapedCommentText.Length - 1 Then Throw New Exception("Escape sequence started at end of comment.")
63:                         Select Case escapedCommentText(n + 1)
64:                             Case "\"c
65:                                 commentText.Append("\"c)
66:                             Case "n"
67:                                 commentText.Append(vbCrLf)
68:                             Case Else
69:                                 Throw New Exception("Unknown comment escape sequence \" & escapedCommentText(n + 1) & ".")
70:                         End Select
71:                         n += 1
72:                     Else
73:                         commentText.Append(escapedCommentText(n))
74:                     End If
75:                 Next
76:                 singlePolicy.Comment = commentText.ToString
77:             End If
78:             Select Case Trim(nextLine()).ToLowerInvariant
79:                 Case "not configured"
80:                     singlePolicy.BasicState = PolicyState.NotConfigured
81:                 Case "enabled"
82:                     singlePolicy.BasicState = PolicyState.Enabled
83:                 Case "disabled"
84:                     singlePolicy.BasicState = PolicyState.Disabled
85:                 Case Else
86:                     Throw New Exception("Unknown policy state.")
87:             End Select
88:             If singlePolicy.BasicState = PolicyState.Enabled Then
89:                 Do Until atEnd() OrElse Trim(peekLine()) = ""
90:                     Dim optionParts = Split(Trim(nextLine()), ": ", 2) ' Name and value
91:                     Dim valueText = optionParts(1)
92:                     Dim newObj As Object
93:                     If valueText.StartsWith("#") Then
94:                         newObj = CInt(valueText.Substring(1))
95:                     ElseIf UInteger.TryParse(valueText, 0) Then
96:                         newObj = CUInt(valueText)
97:                     ElseIf Boolean.TryParse(valueText, False) Then
98:                         newObj = CBool(valueText)
99:                     ElseIf valueText.StartsWith("'") And valueText.EndsWith("'") Then
100:                         newObj = valueText.Substring(1, valueText.Length - 2)
101:                     ElseIf valueText.StartsWith("""") And valueText.EndsWith("""") Then
102:                         newObj = getAllStrings(valueText, """").ToArray
103:                     ElseIf valueText = "None" Then
104:                         newObj = Array.CreateInstance(GetType(String), 0)
105:                     ElseIf valueText = "[" Then
106:                         Dim entries As New List(Of List(Of String))
107:                         Do Until Trim(peekLine()) = "]"
108:                             entries.Add(getAllStrings(nextLine(), """"))
109:                         Loop
110:                         nextLine() ' Skip the closing bracket
111:                         If entries.Count = 0 Then
112:                             newObj = Nothing ' PolicyProcessing will ignore an empty list element
113:                         ElseIf entries(0).Count = 1 Then
114:                             newObj = entries.Select(Function(l) l(0)).ToList
115:                         Else
116:                             newObj = entries.ToDictionary(Function(l) l(0), Function(l) l(1))
117:                         End If
118:                     Else
119:                         Throw New Exception("Unknown option data format.")
120:                     End If
121:                     singlePolicy.ExtraOptions.Add(optionParts(0), newObj)
122:                 Loop
123:             End If
124:             Policies.Add(singlePolicy)
125:         Loop
126:     End Sub
```

### PolicyPlus/Main.vb
```
707:     Private Sub ImportSemanticPolicyToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles ImportSemanticPolicyToolStripMenuItem.Click
708:         ' Open the SPOL import dialog and apply the data
709:         If ImportSpol.ShowDialog() = DialogResult.OK Then
710:             Dim spol = ImportSpol.Spol
711:             Dim fails = spol.ApplyAll(AdmxWorkspace, UserPolicySource, CompPolicySource, UserComments, CompComments)
712:             MoveToVisibleCategoryAndReload()
713:             If fails = 0 Then
714:                 MsgBox("Semantic Policy successfully applied.", MsgBoxStyle.Information)
715:             Else
716:                 MsgBox(fails & " out of " & spol.Policies.Count & " could not be applied.", MsgBoxStyle.Exclamation)
717:             End If
718:         End If
719:     End Sub
```
