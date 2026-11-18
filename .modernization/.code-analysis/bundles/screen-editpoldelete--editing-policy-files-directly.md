# Screen: Edit policy file, as Editing policy files directly

At a glance: 3 owned rules, 0 relied on, 3 actions, 2 files (1 own, 0 relied on, 1 of neighbour screens, 0 generated), 0 disputed.

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
  L3["Program setup and settings"]:::hit
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
Part of: Editing policy files directly (Setting and storing policies).

```mermaid
flowchart LR
  S0["Edit policy file, as Editing policy files directly"]:::hit
  P0["Policy Plus main window"] -->|"opens"| S0
  C0(["Editing policy files directly"])
  C0 --- S0
  classDef hit fill:#fde68a,stroke:#b45309,color:#1f2937
```

## Boundary
- Opened by **Policy Plus main window** (bundle: screen policy-plus-main-window), at `PolicyPlus/Main.vb:776-794`

## Contract: what it must do
### Edit policy file
Browse a policy file and, in steps, add keys and values, edit text, number and list values, or choose what to delete.
Controls (42): Button: ButtonOK, ButtonOK, ButtonOK, ButtonOK, ButtonOK, ButtonOK; CheckBox: CheckHexadecimal; ComboBox: ComboKind; Friend WithEvents ButtonAddKey As Button: ButtonAddKey; Friend WithEvents ButtonAddValue As Button: ButtonAddValue; Friend WithEvents ButtonDeleteValue As Button: ButtonDeleteValue; Friend WithEvents ButtonEdit As Button: ButtonEdit; Friend WithEvents ButtonExport As Button: ButtonExport; Friend WithEvents ButtonForget As Button: ButtonForget; Friend WithEvents ButtonImport As Button: ButtonImport; Friend WithEvents ButtonSave As Button: ButtonSave; Friend WithEvents ChItem As ColumnHeader: ChItem; Friend WithEvents ChValue As ColumnHeader: ChValue; Friend WithEvents LsvPol As ListView: LsvPol; Label: Label1, Label1, Label1, Label2, Label1, Label2, Label1, Label2, Label1, Label2; RadioButton: OptClearFirst, OptDeleteOne, OptPurge; TextBox: TextKey, TextValueName, TextName, TextData, TextName, TextName, TextData, TextName, TextName; WideRangeNumericUpDown: NumData

Actions
- **ACT-06724348** Accepts the delete dialog when a choice is made and asks for a value name when deleting one value. — `PolicyPlus/EditPolDelete.vb:10-19`; started by person
- **ACT-51807884** Closes the delete dialog as cancelled when Escape is pressed. — `PolicyPlus/EditPolDelete.vb:20-22`; started by person
- **ACT-32228976** Enables the value name box only while the delete-one-value option is chosen. — `PolicyPlus/EditPolDelete.vb:23-25`; started by person

Rules
- **BR-73744492** When Delete is confirmed with the option to clear the key or to delete all values under it, the choice is accepted without further input; no option is chosen when the dialog opens, and confirming with none chosen does nothing. — `PolicyPlus/EditPolDelete.vb:11`; also rests on `PolicyPlus/EditPolDelete.vb:3-5`
- **BR-49490179** When Delete is confirmed with the option to delete one value and the value name is empty, it is refused and the person is told "You must enter a value name."; with a name, the choice is accepted. — `PolicyPlus/EditPolDelete.vb:12-18`
- **BR-32916641** The value name box in the delete dialog can be typed in only while the option to delete one value is chosen. — `PolicyPlus/EditPolDelete.vb:24`


## Read order
| Tier | File | Lines | Why |
| --- | --- | --- | --- |
| own | `PolicyPlus/EditPolDelete.vb` | whole file | starts 3 actions; decides 3 owned rules |
| neighbour screen | `PolicyPlus/Main.vb` | 776-794 | opens this screen: Policy Plus main window |

## Source

### PolicyPlus/EditPolDelete.vb
```
1: ﻿Public Class EditPolDelete
2:     Public Function PresentDialog(ContainerKey As String) As DialogResult
3:         OptClearFirst.Checked = False
4:         OptDeleteOne.Checked = False
5:         OptPurge.Checked = False
6:         TextKey.Text = ContainerKey
7:         TextValueName.Text = ""
8:         Return ShowDialog()
9:     End Function
10:     Private Sub ButtonOK_Click(sender As Object, e As EventArgs) Handles ButtonOK.Click
11:         If OptClearFirst.Checked Or OptPurge.Checked Then DialogResult = DialogResult.OK
12:         If OptDeleteOne.Checked Then
13:             If TextValueName.Text = "" Then
14:                 MsgBox("You must enter a value name.", MsgBoxStyle.Exclamation)
15:                 Exit Sub
16:             End If
17:             DialogResult = DialogResult.OK
18:         End If
19:     End Sub
20:     Private Sub EditPolDelete_KeyDown(sender As Object, e As KeyEventArgs) Handles Me.KeyDown
21:         If e.KeyCode = Keys.Escape Then DialogResult = DialogResult.Cancel
22:     End Sub
23:     Sub ChoiceChanged(sender As Object, e As EventArgs) Handles OptClearFirst.CheckedChanged, OptDeleteOne.CheckedChanged, OptPurge.CheckedChanged
24:         TextValueName.Enabled = OptDeleteOne.Checked
25:     End Sub
26: End Class
```

### PolicyPlus/Main.vb
```
776:     Private Sub EditRawPOLToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles EditRawPOLToolStripMenuItem.Click
777:         Dim userIsPol = TypeOf UserPolicySource Is PolFile
778:         Dim compIsPol = TypeOf CompPolicySource Is PolFile
779:         If Not (userIsPol Or compIsPol) Then
780:             MsgBox("Neither loaded source is backed by a POL file.", MsgBoxStyle.Exclamation)
781:             Exit Sub
782:         End If
783:         If CInt(Configuration.GetValue("EditPolDangerAcknowledged", 0)) = 0 Then
784:             If MsgBox("Caution! This tool is for very advanced users. Improper modifications may result in inconsistencies in policies' states." & vbCrLf & vbCrLf &
785:                       "Changes operate directly on the policy source, though they will not be committed to disk until you save. Are you sure you want to continue?",
786:                       MsgBoxStyle.Exclamation Or MsgBoxStyle.YesNo) = MsgBoxResult.No Then Exit Sub
787:             Configuration.SetValue("EditPolDangerAcknowledged", 1)
788:         End If
789:         If OpenSection.PresentDialog(userIsPol, compIsPol) = DialogResult.OK Then
790:             EditPol.PresentDialog(PolicyIcons, If(OpenSection.SelectedSection = AdmxPolicySection.Machine, CompPolicySource, UserPolicySource),
791:                                   OpenSection.SelectedSection = AdmxPolicySection.User)
792:         End If
793:         MoveToVisibleCategoryAndReload()
794:     End Sub
```
