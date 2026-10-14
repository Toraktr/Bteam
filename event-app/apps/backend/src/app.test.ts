import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

async function postEvent(app: ReturnType<typeof createApp>, body: unknown) {
  return app.request("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("イベント出欠 API", () => {
  it("要件1+2: タイトル・開催日時・定員・締め切りでイベントを作れる", async () => {
    const app = createApp(() => new Date("2026-01-01T00:00:00Z"));
    const res = await postEvent(app, {
      title: "新年会",
      datetime: "2026-02-01T18:00:00+09:00",
      capacity: 10,
      deadline: "2026-01-25T23:59:00+09:00",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("新年会");
    expect(body.capacity).toBe(10);
  });

  it("要件3: 定員は増やせるが減らせない", async () => {
    const app = createApp(() => new Date("2026-01-01T00:00:00Z"));
    const created = await (
      await postEvent(app, {
        title: "勉強会",
        datetime: "2026-02-01T18:00:00+09:00",
        capacity: 2,
        deadline: "2026-01-25T23:59:00+09:00",
      })
    ).json();

    const up = await app.request(`/api/events/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capacity: 5 }),
    });
    expect(up.status).toBe(200);
    expect((await up.json()).capacity).toBe(5);

    const down = await app.request(`/api/events/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capacity: 3 }),
    });
    expect(down.status).toBe(400);
  });

  it("要件4+5+6: 名前だけ・3択・締め切りまで上書き可", async () => {
    let t = new Date("2026-01-01T00:00:00Z");
    const app = createApp(() => t);
    const created = await (
      await postEvent(app, {
        title: "送別会",
        datetime: "2026-02-01T18:00:00+09:00",
        capacity: 10,
        deadline: "2026-01-10T00:00:00Z",
      })
    ).json();

    const rsvp = (name: string, status: string) =>
      app.request(`/api/events/${created.id}/rsvps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status }),
      });

    // 名前だけで参加
    expect((await rsvp("たろう", "attend")).status).toBe(201);
    // 未定・不参加も選べる
    expect((await rsvp("はなこ", "maybe")).status).toBe(201);
    expect((await rsvp("じろう", "decline")).status).toBe(201);
    // 同じ名前で上書き (最後の回答が残る)
    expect((await rsvp("たろう", "decline")).status).toBe(200);
    const detail = await (await app.request(`/api/events/${created.id}`)).json();
    expect(detail.counts).toMatchObject({ attend: 0, decline: 2, maybe: 1 });

    // 不正な選択肢は 400
    expect((await rsvp("さぶろう", "join")).status).toBe(400);

    // 締め切り後は変更不可
    t = new Date("2026-01-11T00:00:00Z");
    expect((await rsvp("たろう", "attend")).status).toBe(403);
  });

  it("定員に達したら参加は 409、未定・不参加は通る", async () => {
    const app = createApp(() => new Date("2026-01-01T00:00:00Z"));
    const created = await (
      await postEvent(app, {
        title: "少人数制",
        datetime: "2026-02-01T18:00:00+09:00",
        capacity: 1,
        deadline: "2026-01-25T23:59:00+09:00",
      })
    ).json();
    const rsvp = (name: string, status: string) =>
      app.request(`/api/events/${created.id}/rsvps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status }),
      });
    expect((await rsvp("A", "attend")).status).toBe(201);
    expect((await rsvp("B", "attend")).status).toBe(409);
    expect((await rsvp("B", "maybe")).status).toBe(201);
  });
});
