# คู่มือการติดตั้งและ Deploy

เอกสารนี้อธิบายการนำเว็บไซต์ขึ้นใช้งานจริงบน **Railway** (แนะนำ) และบนเซิร์ฟเวอร์ทั่วไป พร้อมการตั้งค่า Google sign-in การสำรองข้อมูล และการตรวจหลัง deploy

## 1. สิ่งที่ระบบต้องการ

| องค์ประกอบ | ข้อกำหนด |
|---|---|
| Node.js | ≥ 22 (กำหนดใน `package.json` → `engines`) |
| PostgreSQL | ≥ 14 (ทดสอบกับ 16) |
| ที่เก็บไฟล์ | โฟลเดอร์ถาวรสำหรับใบงานที่นักเรียนอัปโหลด (`UPLOAD_DIR`) ไฟล์ละไม่เกิน 10 MB |
| หน่วยความจำ | ≥ 512 MB สำหรับรัน, ≥ 2 GB ระหว่าง `next build` |

## 2. ตัวแปรสภาพแวดล้อม (Environment variables)

| ตัวแปร | จำเป็น | ความหมาย |
|---|---|---|
| `DATABASE_URL` | ✔ | URL ของ PostgreSQL เช่น `postgres://user:pass@host:5432/db` |
| `BETTER_AUTH_SECRET` | ✔ | ข้อความสุ่มยาว ≥ 32 ตัวอักษร (`openssl rand -base64 32`) ระบบไม่ยอมเริ่มใน production ถ้าใช้ค่าที่ขึ้นต้นด้วย `dev-secret` |
| `BETTER_AUTH_URL` | ✔* | URL สาธารณะของเว็บ เช่น `https://ee.example.ac.th` (*บน Railway ถ้าไม่ตั้ง ระบบใช้ `https://$RAILWAY_PUBLIC_DOMAIN` ให้อัตโนมัติ ตั้งเองเมื่อใช้โดเมนของสถานศึกษา) |
| `UPLOAD_DIR` | แนะนำ | โฟลเดอร์เก็บใบงาน ค่าเริ่มต้น `./.uploads` บน Railway ให้ชี้ไปที่ volume เช่น `/data/uploads` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | ไม่บังคับ | เปิดปุ่ม “เข้าสู่ระบบด้วย Google” (ดูหัวข้อ 5) |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | ครั้งแรก | ให้ `npm run db:seed` สร้างผู้ดูแลระบบคนแรกใน production (ลบ `ADMIN_PASSWORD` ออกหลัง deploy ครั้งแรก และเปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบ) |
| `TRUSTED_ORIGINS` | ไม่บังคับ | โดเมนเพิ่มเติมที่อนุญาต คั่นด้วยจุลภาค (เช่น โดเมน Railway เดิมเมื่อย้ายไปโดเมนสถานศึกษา) |
| `GUEST_MODE` | ไม่บังคับ | `on` (ค่าเริ่มต้น) = ผู้เยี่ยมชมเรียนได้โดยไม่ต้องมีบัญชี ความก้าวหน้าเก็บในเบราว์เซอร์ ไม่มีแบบทดสอบและการส่งใบงาน · `off` = บทเรียนต้องเข้าสู่ระบบเท่านั้น |
| `GUEST_MAX_WEEK` | ไม่บังคับ | สัปดาห์สุดท้ายที่ผู้เยี่ยมชมเปิดได้ (1–18 ค่าเริ่มต้น 18) เช่น `3` = ผู้เยี่ยมชมดูตัวอย่างได้ 3 สัปดาห์แรก |
| `DB_POOL_MAX` | ไม่บังคับ | จำนวน connection สูงสุด (ค่าเริ่มต้น 10) |
| `SEED_DEMO` | ห้ามใช้บนเว็บจริง | `1` = สร้างบัญชีทดลองแม้เป็น production |

## 3. Deploy บน Railway

### 3.1 วิธีที่แน่นอนที่สุด: ตั้งค่าผ่าน Dashboard

1. Push โค้ดขึ้น GitHub แล้วใน Railway เลือก **New Project → Deploy from GitHub repo**
2. ในโปรเจกต์เดียวกันกด **+ New → Database → PostgreSQL**
3. เปิด service ของเว็บ → **Settings**
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start` (Next.js อ่านพอร์ตจากตัวแปร `PORT` ที่ Railway กำหนดให้เอง)
   - **Pre-Deploy Command:** `npm run db:release` (รัน migration และซิงก์คลังข้อสอบก่อนเปลี่ยนเวอร์ชัน ข้อสอบที่ครูแก้ไขแล้วจะไม่ถูกเขียนทับ)
   - **Healthcheck Path:** `/api/health` (ตอบ 200 เมื่อเชื่อมฐานข้อมูลได้, 503 เมื่อเชื่อมไม่ได้) และ Healthcheck Timeout 120 วินาที
   - **Networking → Generate Domain** เพื่อได้ URL สาธารณะ
4. **+ New → Volume** แล้ว mount ที่ `/data` กับ service เว็บ
5. **Variables** ของ service เว็บ:
   ```
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   BETTER_AUTH_SECRET=<ผลจาก openssl rand -base64 32>
   UPLOAD_DIR=/data/uploads
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<รหัสผ่านชั่วคราวที่คาดเดายาก>
   ```
6. กด Deploy เมื่อเสร็จ เปิด `https://<โดเมน>/api/health` ต้องได้ `{"status":"ok","db":"ok",...}`
7. เข้าสู่ระบบด้วย `ADMIN_USERNAME`/`ADMIN_PASSWORD` แล้วเปลี่ยนรหัสผ่าน จากนั้นลบตัวแปร `ADMIN_PASSWORD` ออก

### 3.2 วิธี Infrastructure as Code (ไม่บังคับ)

Railway ประกาศว่าไฟล์ `railway.json`/`railway.toml` แบบเดิมจะใช้ได้ถึง 2026-12-01 และแทนที่ด้วย Infrastructure as Code โปรเจกต์นี้จึงมี `.railway/railway.ts` ที่ประกาศ PostgreSQL, service เว็บ, volume และตัวแปรไว้ครบ (ผ่านการตรวจ type กับแพ็กเกจ `railway@3.16.0`)

```bash
npm i -g @railway/cli        # ต้องใช้ Railway CLI ≥ 5.42.1
railway login
railway config plan          # ดูสิ่งที่จะเปลี่ยน (อ่านอย่างเดียว)
railway config apply
```

> **สถานะ:** ไฟล์นี้ยังไม่ได้ทดสอบ `apply` กับบัญชี Railway จริง เพราะ engine ของ IaC อยู่ใน Railway CLI ที่ต้องเข้าสู่ระบบ ถ้า `plan` แจ้งข้อผิดพลาด ให้ใช้วิธีในหัวข้อ 3.1 ซึ่งให้ผลเหมือนกัน หลัง apply ยังต้อง Generate Domain และตั้ง `ADMIN_USERNAME`/`ADMIN_PASSWORD` และ (ถ้าใช้) ค่า Google ใน Dashboard เอง

### 3.3 ใช้โดเมนของสถานศึกษา

เพิ่ม Custom Domain ใน Railway แล้วตั้ง `BETTER_AUTH_URL=https://<โดเมนสถานศึกษา>` ถ้ายังต้องการให้โดเมน `*.up.railway.app` ใช้งานได้ ให้ใส่ไว้ใน `TRUSTED_ORIGINS` และอย่าลืมเพิ่ม Redirect URI ใหม่ใน Google Cloud Console

## 4. Deploy บนเซิร์ฟเวอร์ทั่วไป (VPS / เซิร์ฟเวอร์ของวิทยาลัย)

```bash
git clone <repo> eelearn && cd eelearn
npm ci
export NODE_ENV=production DATABASE_URL=... BETTER_AUTH_SECRET=... BETTER_AUTH_URL=https://... UPLOAD_DIR=/var/lib/eelearn/uploads
npm run build
npm run db:release
npm start                      # พอร์ต 3000 (หรือตั้ง PORT)
```

ใช้ systemd หรือ pm2 ดูแล process และวาง reverse proxy (nginx/Caddy) ที่ทำ HTTPS ไว้ด้านหน้า ตั้ง `client_max_body_size 12m` (nginx) เพื่อให้อัปโหลดใบงาน 10 MB ได้

## 5. เปิดใช้ Google sign-in

1. Google Cloud Console → APIs & Services → **Credentials → Create OAuth client ID** ชนิด Web application
2. **Authorized redirect URI:** `<BETTER_AUTH_URL>/api/auth/callback/google` เช่น `https://ee.example.ac.th/api/auth/callback/google`
3. ตั้ง `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET` แล้ว deploy ใหม่ ปุ่ม Google จะปรากฏในหน้าเข้าสู่ระบบ
4. **ต้องเพิ่มรายชื่อที่อนุญาต** ที่ “ผู้ดูแลระบบ → อีเมล Google” (อีเมลรายคน หรือทั้งโดเมน `*@school.ac.th` พร้อมบทบาทและห้องเรียนเริ่มต้น) ครูเพิ่มอีเมลนักเรียนของห้องตนเองได้ บัญชี Google ที่ไม่อยู่ในรายชื่อจะเข้าสู่ระบบไม่ได้

> **สถานะ:** โค้ดส่วน Google ผ่านการตรวจ type และกติกา allowlist ผ่าน smoke test แล้ว แต่ยังไม่ได้ทดสอบการเข้าสู่ระบบกับ Google จริง เพราะต้องใช้ OAuth client ของสถานศึกษา ควรทดสอบด้วยบัญชีครู 1 คนก่อนเปิดให้นักเรียน

## 6. การสำรองและกู้คืนข้อมูล

| สิ่งที่ต้องสำรอง | วิธี |
|---|---|
| ฐานข้อมูล | ใช้ Backups ของ Railway Postgres หรือรัน `npm run db:backup` จากเครื่องที่มี `pg_dump` (ตั้ง `DATABASE_URL` เป็น public URL) ได้ไฟล์ `backups/eelearn-<เวลา>.dump` |
| ไฟล์ใบงาน | สำรองโฟลเดอร์ `UPLOAD_DIR` (volume) เช่น `tar czf uploads.tgz /data/uploads` |
| สำเนาข้อมูลการเรียนแบบอ่านได้ | ผู้ดูแลระบบ → สำรองข้อมูล → ดาวน์โหลด JSON (ไม่มีรหัสผ่าน) |

กู้คืนฐานข้อมูล: `pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backups/eelearn-....dump`

แนะนำให้สำรองอย่างน้อยสัปดาห์ละครั้งและก่อนเปลี่ยนภาคเรียน

## 6.1 อัปเดตเวอร์ชันนี้บนเว็บที่ใช้งานอยู่แล้ว (17 ต.ค. 2569)

เวอร์ชันนี้มี migration ใหม่ 1 รายการ (`drizzle/0001_lab_notes.sql` เพิ่มคอลัมน์สมุดบันทึกผลการทดลอง — ไม่ลบหรือแก้ข้อมูลเดิม) และข้อสอบ/ภารกิจแล็บใหม่ เมื่อ push โค้ดขึ้น Railway คำสั่ง `npm run db:release` ใน Pre-Deploy จะรัน migration และซิงก์คลังข้อสอบให้เอง (ข้อสอบที่ครูแก้ไขไว้ไม่ถูกเขียนทับ) ความก้าวหน้าของนักเรียนคงเดิม ก่อน deploy แนะนำให้สำรองฐานข้อมูลตามหัวข้อ 6 หนึ่งครั้ง

ผลที่นักเรียนเห็นหลังอัปเดต: (1) ต้องเรียนตามลำดับขั้นในสัปดาห์ (ครูปิดได้ที่ การปลดล็อก) นักเรียนที่เคยทำขั้นหลังไว้ก่อนขั้นหน้า ขั้นนั้นยังนับว่าเสร็จ แต่จะเปิดขั้นถัดไปเมื่อทำขั้นที่ขาดครบ (2) แล็บบางสัปดาห์มีภารกิจเพิ่ม สัปดาห์ที่ "ห้องทดลองเสร็จแล้ว" อยู่ก่อนไม่ถูกย้อนสถานะ

## 6.2 อัปเดตรอบ 18 ต.ค. 2569 (นักเรียนต่างแผนก)

migration เพิ่ม `drizzle/0002_tracks.sql`: คอลัมน์ `track` (แผนก) ในตาราง `user` และ `classroom` เป็นค่าว่างได้ ไม่แก้ข้อมูลเดิม `npm run db:release` รันให้เองตอน deploy

## 7. การอัปเดตเนื้อหาหรือโค้ด

1. แก้เนื้อหาที่ `src/content/weeks/wNN.ts` หรือภาพที่ `src/content/figures/wNN.tsx`
2. ตรวจ: `npm run content:check -- --all && npm run typecheck && npm test`
3. Push → Railway build และรัน `db:release` ให้อัตโนมัติ ข้อสอบใหม่ถูกเพิ่ม ข้อสอบที่ถูกลบจากเนื้อหาถูกปิดใช้งาน ข้อสอบที่ครูแก้ไขในระบบจะคงไว้
4. ถ้าแก้ schema ฐานข้อมูล (`src/lib/db/schema.ts`) ให้รัน `npm run db:generate` แล้ว commit ไฟล์ใน `drizzle/`

## 8. ตรวจหลัง deploy (checklist)

- [ ] `/api/health` ตอบ `status: ok`
- [ ] เข้าสู่ระบบผู้ดูแลระบบ เปลี่ยนรหัสผ่าน ลบ `ADMIN_PASSWORD`
- [ ] สร้างห้องเรียนและภาคเรียน กำหนดครู สร้างบัญชีนักเรียน (ครู → บัญชีนักเรียน → สร้างบัญชีนักเรียนหลายคนพร้อมกัน)
- [ ] นักเรียนทดลอง 1 คนเข้าเรียนสัปดาห์ที่ 1 ทำกิจกรรม 1 ข้อ แล้วครูเห็นความก้าวหน้า
- [ ] อัปโหลดใบงาน PDF 1 ไฟล์และเปิดดูจากหน้าครูได้ (ยืนยันว่า volume ทำงาน)
- [ ] ส่งออก Gradebook เป็น Excel เปิดได้และแสดงภาษาไทยถูกต้อง
- [ ] (ถ้าใช้) เข้าสู่ระบบด้วย Google ด้วยอีเมลที่อยู่ในรายชื่ออนุญาต และลองอีเมลที่ไม่อยู่ในรายชื่อว่าถูกปฏิเสธ
- [ ] ตั้งการสำรองข้อมูล

## 9. แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุและวิธีแก้ |
|---|---|
| `/api/health` ได้ 503 | เชื่อมฐานข้อมูลไม่ได้ หรือ env ไม่ผ่านการตรวจ ดู log ของ service ระบบแจ้งเป็นข้อความว่าตัวแปรใดผิด (เช่น secret สั้นเกินหรือขึ้นต้น `dev-secret`) |
| เข้าสู่ระบบแล้วเด้งกลับหน้า login | `BETTER_AUTH_URL` ไม่ตรงกับโดเมนที่เปิดอยู่ หรือไม่ได้ใช้ HTTPS ใน production |
| อัปโหลดใบงานไม่สำเร็จ | ไฟล์ > 10 MB หรือชนิดไม่รองรับ (รองรับ PDF, JPG, PNG, WEBP, HEIC, DOCX) หรือ `UPLOAD_DIR` ไม่มีสิทธิ์เขียน / ไม่ได้ mount volume ไฟล์จะหายเมื่อ redeploy |
| Google แจ้ง redirect_uri_mismatch | Redirect URI ใน Google Cloud ต้องตรงกับ `<BETTER_AUTH_URL>/api/auth/callback/google` ทุกตัวอักษร |
| บัญชี Google ถูกปฏิเสธ | อีเมลยังไม่อยู่ในรายชื่อ Google ที่อนุญาต |
