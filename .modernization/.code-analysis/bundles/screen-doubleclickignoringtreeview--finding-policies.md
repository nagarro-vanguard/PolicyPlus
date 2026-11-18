# Screen: Filter the policy list, as Finding policies

At a glance: 1 owned rule, 0 relied on, 1 action, 2 files (1 own, 0 relied on, 1 of neighbour screens, 0 generated), 0 disputed.

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
Part of: Finding policies (Reading policy definitions).

```mermaid
flowchart LR
  S0["Filter the policy list, as Finding policies"]:::hit
  P0["Policy Plus main window"] -->|"opens"| S0
  C0(["Finding policies"])
  C0 --- S0
  classDef hit fill:#fde68a,stroke:#b45309,color:#1f2937
```

## Boundary
- Opened by **Policy Plus main window** (bundle: screen policy-plus-main-window), at `PolicyPlus/Main.vb:692-700`

## Contract: what it must do
### Filter the policy list
Narrow the policy list by state, comment, support and other conditions.
Controls (13): Button: OkButton, ResetButton; CheckBox: AlwaysMatchAnyCheckbox, MatchBlankSupportCheckbox, SupportedCheckbox; ComboBox: CommentedCombobox, PolicyStateCombobox, PolicyTypeCombobox; GroupBox: RequirementsBox; Label: CommentedLabel, PolicyStateLabel, PolicyTypeLabel; TreeView (DoubleClickIgnoringTreeView): AllowedProductsTreeview

Actions
- **ACT-86274598** Drops the double-click message so the tree check state stays in step — `PolicyPlus/FilterOptions.vb:155-158`; started by person

Rules
- **BR-98008638** Double-clicking a product checkbox does nothing, so a tick shown always agrees with the tick kept. — `PolicyPlus/FilterOptions.vb:155-158`; also rests on `PolicyPlus/FilterOptions.vb:151-152`


## Read order
| Tier | File | Lines | Why |
| --- | --- | --- | --- |
| own | `PolicyPlus/FilterOptions.vb` | whole file | starts 1 action; decides 1 owned rule |
| neighbour screen | `PolicyPlus/Main.vb` | 692-700 | opens this screen: Policy Plus main window |

## Source

### PolicyPlus/FilterOptions.vb
```
1: ﻿Public Class FilterOptions
2:     Public CurrentFilter As FilterConfiguration
3:     Dim ProductNodes As Dictionary(Of PolicyPlusProduct, TreeNode)
4:     Public Function PresentDialog(Configuration As FilterConfiguration, Workspace As AdmxBundle) As DialogResult
5:         CurrentFilter = Nothing
6:         ProductNodes = New Dictionary(Of PolicyPlusProduct, TreeNode)
7:         AllowedProductsTreeview.Nodes.Clear()
8:         Dim addProductsToNodeCollection As Action(Of IEnumerable(Of PolicyPlusProduct), TreeNodeCollection)
9:         addProductsToNodeCollection = Sub(Products As IEnumerable(Of PolicyPlusProduct), Nodes As TreeNodeCollection)
10:                                           For Each product In Products
11:                                               Dim node = Nodes.Add(product.DisplayName)
12:                                               ProductNodes.Add(product, node)
13:                                               node.Tag = product
14:                                               If product.Children IsNot Nothing Then addProductsToNodeCollection(product.Children, node.Nodes)
15:                                           Next
16:                                       End Sub
17:         addProductsToNodeCollection(Workspace.Products.Values, AllowedProductsTreeview.Nodes) ' Recursively add products
18:         PrepareDialog(Configuration)
19:         Return ShowDialog()
20:     End Function
21:     Sub PrepareDialog(Configuration As FilterConfiguration)
22:         ' Set the UI element state from the current filter
23:         If Configuration.ManagedPolicy.HasValue Then
24:             PolicyTypeCombobox.SelectedIndex = If(Configuration.ManagedPolicy.Value, 1, 2)
25:         Else
26:             PolicyTypeCombobox.SelectedIndex = 0
27:         End If
28:         If Configuration.PolicyState.HasValue Then
29:             Select Case Configuration.PolicyState.Value
30:                 Case FilterPolicyState.NotConfigured
31:                     PolicyStateCombobox.SelectedIndex = 1
32:                 Case FilterPolicyState.Configured
33:                     PolicyStateCombobox.SelectedIndex = 2
34:                 Case FilterPolicyState.Enabled
35:                     PolicyStateCombobox.SelectedIndex = 3
36:                 Case FilterPolicyState.Disabled
37:                     PolicyStateCombobox.SelectedIndex = 4
38:             End Select
39:         Else
40:             PolicyStateCombobox.SelectedIndex = 0
41:         End If
42:         If Configuration.Commented.HasValue Then
43:             CommentedCombobox.SelectedIndex = If(Configuration.Commented.Value, 1, 2)
44:         Else
45:             CommentedCombobox.SelectedIndex = 0
46:         End If
47:         For Each node In ProductNodes.Values
48:             node.Checked = False
49:         Next
50:         If Configuration.AllowedProducts Is Nothing Then
51:             SupportedCheckbox.Checked = False
52:             AlwaysMatchAnyCheckbox.Checked = True
53:             MatchBlankSupportCheckbox.Checked = True
54:         Else
55:             SupportedCheckbox.Checked = True
56:             For Each product In Configuration.AllowedProducts
57:                 ProductNodes(product).Checked = True
58:             Next
59:             AlwaysMatchAnyCheckbox.Checked = Configuration.AlwaysMatchAny
60:             MatchBlankSupportCheckbox.Checked = Configuration.MatchBlankSupport
61:             ' Expand to show all products with a different check state than their parent
62:             Dim expandIfNecessary As Action(Of TreeNode)
63:             expandIfNecessary = Sub(Node As TreeNode)
64:                                     For Each subnode As TreeNode In Node.Nodes
65:                                         expandIfNecessary(subnode)
66:                                         If subnode.IsExpanded Or subnode.Checked <> Node.Checked Then
67:                                             Node.Expand()
68:                                         End If
69:                                     Next
70:                                 End Sub
71:             For Each node As TreeNode In AllowedProductsTreeview.Nodes
72:                 expandIfNecessary(node)
73:             Next
74:         End If
75:     End Sub
76:     Private Sub SupportedCheckbox_CheckedChanged(sender As Object, e As EventArgs) Handles SupportedCheckbox.CheckedChanged
77:         RequirementsBox.Enabled = SupportedCheckbox.Checked
78:     End Sub
79:     Private Sub FilterOptions_KeyDown(sender As Object, e As KeyEventArgs) Handles Me.KeyDown
80:         If e.KeyCode = Keys.Escape Then DialogResult = DialogResult.Cancel
81:     End Sub
82:     Private Sub ResetButton_Click(sender As Object, e As EventArgs) Handles ResetButton.Click
83:         PrepareDialog(New FilterConfiguration)
84:     End Sub
85:     Private Sub OkButton_Click(sender As Object, e As EventArgs) Handles OkButton.Click
86:         ' Create a filter configuration object from the user's settings
87:         Dim newConf As New FilterConfiguration
88:         Select Case PolicyTypeCombobox.SelectedIndex
89:             Case 1
90:                 newConf.ManagedPolicy = True
91:             Case 2
92:                 newConf.ManagedPolicy = False
93:         End Select
94:         Select Case PolicyStateCombobox.SelectedIndex
95:             Case 1
96:                 newConf.PolicyState = FilterPolicyState.NotConfigured
97:             Case 2
98:                 newConf.PolicyState = FilterPolicyState.Configured
99:             Case 3
100:                 newConf.PolicyState = FilterPolicyState.Enabled
101:             Case 4
102:                 newConf.PolicyState = FilterPolicyState.Disabled
103:         End Select
104:         Select Case CommentedCombobox.SelectedIndex
105:             Case 1
106:                 newConf.Commented = True
107:             Case 2
108:                 newConf.Commented = False
109:         End Select
110:         If SupportedCheckbox.Checked Then
111:             newConf.AlwaysMatchAny = AlwaysMatchAnyCheckbox.Checked
112:             newConf.MatchBlankSupport = MatchBlankSupportCheckbox.Checked
113:             newConf.AllowedProducts = New List(Of PolicyPlusProduct)
114:             For Each kv In ProductNodes
115:                 If kv.Value.Checked Then newConf.AllowedProducts.Add(kv.Key)
116:             Next
117:         End If
118:         CurrentFilter = newConf
119:         DialogResult = DialogResult.OK
120:     End Sub
121:     Private Sub AllowedProductsTreeview_EnabledChanged(sender As Object, e As EventArgs) Handles AllowedProductsTreeview.EnabledChanged
122:         ' Without this, the tree view looks really bad when disabled
123:         AllowedProductsTreeview.BackColor = If(AllowedProductsTreeview.Enabled, SystemColors.Window, SystemColors.Control)
124:     End Sub
125:     Private Sub AllowedProductsTreeview_AfterCheck(sender As Object, e As TreeViewEventArgs) Handles AllowedProductsTreeview.AfterCheck
126:         ' Recursively set the check state on child products only in response to the user
127:         If e.Action = TreeViewAction.Unknown Then Return
128:         PropogateCheckStateDown(e.Node)
129:     End Sub
130:     Sub PropogateCheckStateDown(Node As TreeNode)
131:         For Each subnode As TreeNode In Node.Nodes
132:             subnode.Checked = Node.Checked
133:             PropogateCheckStateDown(subnode)
134:         Next
135:     End Sub
136: End Class
137: Public Enum FilterPolicyState
138:     Configured
139:     NotConfigured
140:     Enabled
141:     Disabled
142: End Enum
143: Public Class FilterConfiguration
144:     Public ManagedPolicy As Boolean?
145:     Public PolicyState As FilterPolicyState?
146:     Public Commented As Boolean?
147:     Public AllowedProducts As List(Of PolicyPlusProduct)
148:     Public AlwaysMatchAny As Boolean
149:     Public MatchBlankSupport As Boolean
150: End Class
151: ' The TreeView control has a bug: the displayed check state gets out of sync with the Checked property when the checkbox is double-clicked
152: ' Fix adapted from https://stackoverflow.com/a/3174824
153: Friend Class DoubleClickIgnoringTreeView
154:     Inherits TreeView
155:     Protected Overrides Sub WndProc(ByRef m As Message)
156:         ' Ignore WM_LBUTTONDBLCLK
157:         If m.Msg <> &H203 Then MyBase.WndProc(m)
158:     End Sub
159: End Class
```

### PolicyPlus/Main.vb
```
692:     Private Sub FilterOptionsToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles FilterOptionsToolStripMenuItem.Click
693:         ' Show the Filter Options dialog and refresh if the filter changes
694:         If FilterOptions.PresentDialog(CurrentFilter, AdmxWorkspace) = DialogResult.OK Then
695:             CurrentFilter = FilterOptions.CurrentFilter
696:             ViewFilteredOnly = True
697:             OnlyFilteredObjectsToolStripMenuItem.Checked = True
698:             MoveToVisibleCategoryAndReload()
699:         End If
700:     End Sub
```
