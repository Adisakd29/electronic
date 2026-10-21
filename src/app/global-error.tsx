"use client";
/* Replaces the root layout when it fails: own <html>/<body>, inline styles only. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: '"IBM Plex Sans Thai", "Noto Sans Thai", system-ui, sans-serif',
          lineHeight: 1.75,
          fontSize: 17,
          background: "#f6f8fb",
          color: "#14213d",
          padding: 16,
        }}
      >
        <title>เกิดข้อผิดพลาด</title>
        <style>{`@media (prefers-color-scheme: dark){body{background:#0d1822!important;color:#e8eef6!important}}`}</style>
        <main style={{ maxWidth: 560 }}>
          <h1 style={{ fontSize: 26, margin: "0 0 8px" }}>ระบบขัดข้องชั่วคราว</h1>
          <p style={{ margin: "0 0 16px" }}>เว็บไซต์โหลดไม่สำเร็จ ความก้าวหน้าที่บันทึกไว้แล้วไม่หาย กดปุ่มด้านล่างเพื่อลองใหม่ ถ้ายังไม่ได้ให้รอสักครู่แล้วเปิดใหม่</p>
          {error.digest ? <p style={{ fontSize: 14, opacity: 0.75 }}>รหัสข้อผิดพลาด: {error.digest}</p> : null}
          <button
            type="button"
            onClick={() => retry()}
            style={{ font: "inherit", fontWeight: 600, padding: "10px 18px", borderRadius: 6, border: 0, background: "#2457f5", color: "#fff", cursor: "pointer" }}
          >
            ลองอีกครั้ง
          </button>
        </main>
      </body>
    </html>
  );
}
