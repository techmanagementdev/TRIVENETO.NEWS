"use client";
export default function SelectAll() {
  return (
    <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600 }}>
      <input type="checkbox" style={{ width: "auto" }} onChange={(e) => {
        const form = e.currentTarget.closest("form");
        form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((c) => (c.checked = e.currentTarget.checked));
      }} />
      Tutti
    </label>
  );
}
