#!/usr/bin/env python3
import re

# Read the file
with open(r'c:\Users\aman0\Downloads\plan-it\src\pages\BoardPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the conflict section with the resolved version
pattern = r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> c0dd564 \(Add task assignee picker and due date validation\)'

resolved = '''<div className="col-span-2">
          <label className="block text-xs text-white/40 mb-1.5">Assign To</label>
          <AssigneePicker
            options={assigneeOptions}
            selectedValue={assigneeId}
            onChange={setAssigneeId}
          />
          <p className="text-xs text-white/30 mt-1.5">Pending invites appear in the list, but they can't be assigned until they join the organization.</p>
        </div>
      </div>
      <div>
        <label className="block text-xs text-white/40 mb-1.5">Column</label>
        <select value={selectedBoardId} onChange={e => setSelectedBoardId(e.target.value)} className="input">
          {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>'''

# Actually, let's do a simpler replacement - find and replace the entire conflict section
conflict_start = content.find('<<<<<<< HEAD')
if conflict_start != -1:
    conflict_end = content.find('>>>>>>> c0dd564', conflict_start)
    if conflict_end != -1:
        # Find the end of the conflict marker line
        conflict_end = content.find('\n', conflict_end) + 1
        
        # Build the resolved version
        resolved_code = '''        <div>
          <label className="block text-xs text-white/40 mb-1.5">Column</label>
          <select value={selectedBoardId} onChange={e => setSelectedBoardId(e.target.value)} className="input">
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-white/40 mb-1.5">Assign To</label>
          <AssigneePicker
            options={assigneeOptions}
            selectedValue={assigneeId}
            onChange={setAssigneeId}
          />
          <p className="text-xs text-white/30 mt-1.5">Pending invites appear in the list, but they can't be assigned until they join the organization.</p>
        </div>
      </div>'''
        
        # Replace the conflict
        resolved_content = content[:conflict_start] + resolved_code + content[conflict_end:]
        
        # Write back
        with open(r'c:\Users\aman0\Downloads\plan-it\src\pages\BoardPage.tsx', 'w', encoding='utf-8') as f:
            f.write(resolved_content)
        
        print("✓ Merge conflict resolved successfully!")
    else:
        print("Error: Could not find end of conflict marker")
else:
    print("Error: No conflict markers found")
