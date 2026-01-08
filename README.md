
## Project info

Care Group Keeper is a lightweight, client‑side React app for managing church care groups. Members are auto-assigned to a weekday care group based on their day of birth. Admins can manage leaders and members, mark attendance, import/export CSVs, and review follow-ups.

Major capabilities:

- Auto-assign members to a weekday group based on DOB (Sunday–Saturday)
- Admin assigns a leader by selecting from the group’s members; a password is generated for the leader
- Attendance marking with presets for absence reasons, 2x consecutive absence follow-ups
- Member management: edit profile, transfer with reason logging, and merge duplicates
- CSV import (members) and export (members, attendance, leaders)
- Offline-friendly: queue actions (attendance, member edit, member transfer) and sync later
- Simple, demo-only password authentication (stored locally)

## How can I edit this code?

There are several ways of editing your application.



**Use your preferred IDE**

Care Group Keeper is a lightweight, client‑side React app for managing church care groups. Members are auto-assigned to a weekday care group based on their day of birth. Admins can manage leaders and members, mark attendance, import/export CSVs, and review follow-ups.

Major capabilities

Auto-assign members to a weekday group based on DOB (Sunday–Saturday)
Admin assigns a leader by selecting from the group’s members; a password is generated for the leader
Attendance marking with presets for absence reasons, 2x consecutive absence follow-ups
Member management: edit profile, transfer with reason logging, and merge duplicates
CSV import (members) and export (members, attendance, leaders)
Offline-friendly: queue actions (attendance, member edit, member transfer) and sync later
Simple, demo-only password authentication (stored locally)
How can I edit this code?
There are several ways of editing your application.

Use your preferred IDE
If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.
The only requirement is having Node.js & npm installed - install with nvm
Steps:
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm i
npm run dev
Edit a file directly in GitHub
Use GitHub Codespaces
What technologies are used for this project?
This project is built with:

Vite
TypeScript
React
shadcn‑ui
Tailwind CSS
Setup and running locally
npm i
npm run dev
The Vite dev server runs at http://localhost:8080 (see 
vite.config.ts
).

Login and roles
Default admin: Pastor John with password admin123.
Leaders are created when the admin assigns a leader by selecting a member. A password is auto‑generated and shown in a dialog. Share it securely with the leader.
For demo purposes, passwords are stored in localStorage.
Core routes
/login – select user and enter password
/admin – admin dashboard (groups, leaders, members)
/admin/reports – charts and statistics
/leader – leader dashboard
/leader/attendance – mark attendance with presets
/leader/followups – open follow-up tasks (created after 2 consecutive absences)
CSV import/export
Import members (Admin → Members → Import CSV)

Columns (header optional, case-insensitive): name, phone, dob
DOB format: YYYY-MM-DD
Duplicate handling: rows with existing phone numbers are skipped
After import, each member is auto-assigned to a weekday group by DOB
Export CSV (Admin → Members)

Members: id,name,phone,dob,careGroupId
Attendance: id,date,memberId,careGroupId,status,absenceReason
Leaders: id,name,role,careGroupId
Offline support and syncing
When offline, actions are queued in localStorage and applied when online or when clicking “Retry Sync” in the navbar.
Currently supported offline actions:
Attendance save
Member edit (profile)
Member transfer (with reason logged)
The navbar shows Online/Offline, pending count, and a Retry Sync button.
Backup/Restore
Backup JSON: Admin → Members → Backup JSON (download a full 
AppData
 snapshot)
Restore JSON: Admin → Members → Restore JSON (import a previously exported snapshot)
Restores run through migrations defined in 
src/lib/mockData.ts
.
Data model (simplified)
User { id, name, role: 'admin' | 'leader', careGroupId?, password? }
CareGroup { id, name, leaderId, day } where day ∈ Sunday…Saturday and ids are sun..sat.
Member { id, name, phone, dob, careGroupId }
AttendanceRecord { id, date, memberId, careGroupId, status, absenceReason? }
TransferLog { id, memberId, fromGroupId, toGroupId, reason, date }
FollowUpTask { id, memberId, careGroupId, leaderUserId?, reason, status, createdAt, completedAt? }
absenceReasons: string[] (presets used when marking absences)