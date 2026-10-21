// Reset the learners used by the e2e scripts (student02, student03) and remove
// anything the scripts created (users/classrooms prefixed "e2e"). student01 is never touched.
import { sql } from "./lib.mjs";
import fs from "node:fs";
import path from "node:path";

const db = sql();
const users = await db`select id, username from "user" where username in ('student02','student03')`;
const ids = users.map((u) => u.id);
if (ids.length) {
  const files = await db`select file_key from submission where user_id in ${db(ids)} and file_key is not null`;
  const dir = path.resolve(process.env.UPLOAD_DIR || "./.uploads");
  for (const f of files) fs.rmSync(path.join(dir, f.file_key.slice(0, 2), f.file_key), { force: true });
  for (const t of [
    "stage_progress",
    "step_progress",
    "interaction_attempt",
    "quiz_attempt",
    "submission",
    "xp_event",
    "achievement",
    "learning_position",
    "lab_task_result",
    "lab_reflection",
    "unlock_override",
    "competency_assessment",
    "certificate",
  ]) {
    await db`delete from ${db(t)} where user_id in ${db(ids)}`;
  }
  await db`update "user" set disabled = false where id in ${db(ids)}`;
}
// Artefacts created by the admin/teacher scripts
await db`delete from classroom where name like 'e2e-%'`;
await db`delete from "user" where username like 'e2e%'`;
console.log("reset:", users.map((u) => u.username).join(", "));
await db.end();
