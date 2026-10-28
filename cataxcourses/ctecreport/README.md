# local_ctecreport — CTEC completion reporting (learn.cataxcourses.com)

Moodle 3.7 local plugin. When a student completes a mapped course, it posts the completion to the
CTEC Education API (`/api/CTECEducation`, or `/api/CTECEducationTest` in Test mode) with Basic Auth.

- Settings: Site administration → Plugins → Local plugins → CTEC completion reporting
  (API user, Test/Live, course id → CTEC course number map, exam name matches for QE scores).
- Log: Site administration → Reports → CTEC reporting log (problems, resend, CTEC ID fixes, dry runs).
- CTEC ID: `ctecid` profile field if present, else the student's answer to the "CTEC ID" feedback question.
- QE courses (-QE- numbers) also send enrolment date and State/Federal/Ethics exam percentages.
- A scheduled task retries pending/temporary failures every 15 minutes.

Install: zip the `ctecreport` folder and upload it as a "local" plugin.

## Dashboard block (`cataxcourses/block_ctecreport`)

`block_ctecreport` ("CTEC reports needing attention") shows site admins counts of completions reported in the
last hour/day/week/month and every report CTEC rejected or that has not gone through, with a plain-English reason.
Install by zipping the folder as `ctecreport/` and uploading it as a "block" plugin, then add it to the Dashboard.
