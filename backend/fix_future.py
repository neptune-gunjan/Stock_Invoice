with open('backend/app/routers/invoice.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
imports_to_move = []

for line in lines:
    if line.startswith('import csv') or line.startswith('import io'):
        imports_to_move.append(line)
    else:
        new_lines.append(line)

# find where __future__ is
future_idx = 0
for i, line in enumerate(new_lines):
    if '__future__' in line:
        future_idx = i + 1
        break

# insert imports_to_move after future_idx
final_lines = new_lines[:future_idx] + imports_to_move + new_lines[future_idx:]

with open('backend/app/routers/invoice.py', 'w', encoding='utf-8') as f:
    f.writelines(final_lines)
