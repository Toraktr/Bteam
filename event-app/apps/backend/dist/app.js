import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { randomUUID } from "node:crypto";
const StatusSchema = z.enum(["attend", "decline", "maybe"]);
const CreateEventSchema = z.object({
    title: z.string().trim().min(1, "タイトルは必須です"),
    datetime: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
        message: "開催日時は有効な日時を指定してください",
    }),
    capacity: z.number().int().min(1, "定員は1以上を指定してください"),
    deadline: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
        message: "締め切りは有効な日時を指定してください",
    }),
});
const UpdateEventSchema = z.object({
    title: z.string().trim().min(1).optional(),
    datetime: z
        .string()
        .refine((s) => !Number.isNaN(Date.parse(s)), {
        message: "開催日時は有効な日時を指定してください",
    })
        .optional(),
    capacity: z.number().int().min(1).optional(),
    deadline: z
        .string()
        .refine((s) => !Number.isNaN(Date.parse(s)), {
        message: "締め切りは有効な日時を指定してください",
    })
        .optional(),
});
const UpsertRsvpSchema = z.object({
    name: z.string().trim().min(1, "名前は必須です").max(50),
    status: StatusSchema,
});
export function createApp(now = () => new Date()) {
    const app = new Hono();
    app.use("/api/*", cors());
    // インメモリストア (イベントID -> イベント, イベントID -> 名前 -> 回答)
    const events = new Map();
    const rsvps = new Map();
    function toDetail(event) {
        const list = [...(rsvps.get(event.id)?.values() ?? [])];
        const counts = {
            attend: 0,
            decline: 0,
            maybe: 0,
        };
        for (const r of list)
            counts[r.status] += 1;
        const remaining = Math.max(0, event.capacity - counts.attend);
        const isClosed = now().getTime() > new Date(event.deadline).getTime();
        return {
            ...event,
            rsvps: list.sort((a, b) => a.name.localeCompare(b.name, "ja")),
            counts,
            attendCount: counts.attend,
            remaining,
            isClosed,
        };
    }
    app.get("/api/health", (c) => c.json({ ok: true }));
    // イベント一覧
    app.get("/api/events", (c) => {
        return c.json([...events.values()].map(toDetail));
    });
    // イベント作成: 要件1 (タイトル・開催日時・定員) + 要件2 (締め切りはイベントごとに自由)
    app.post("/api/events", async (c) => {
        const body = await c.req.json().catch(() => null);
        const parsed = CreateEventSchema.safeParse(body);
        if (!parsed.success) {
            return c.json({ error: parsed.error.issues[0]?.message ?? "不正な入力です" }, 400);
        }
        const id = randomUUID();
        const event = {
            id,
            title: parsed.data.title.trim(),
            datetime: new Date(parsed.data.datetime).toISOString(),
            capacity: parsed.data.capacity,
            deadline: new Date(parsed.data.deadline).toISOString(),
            createdAt: now().toISOString(),
        };
        events.set(id, event);
        rsvps.set(id, new Map());
        return c.json(event, 201);
    });
    // イベント詳細
    app.get("/api/events/:id", (c) => {
        const event = events.get(c.req.param("id"));
        if (!event)
            return c.json({ error: "イベントが見つかりません" }, 404);
        return c.json(toDetail(event));
    });
    // イベント更新: 要件3 (定員はあとから増やせる)
    app.patch("/api/events/:id", async (c) => {
        const event = events.get(c.req.param("id"));
        if (!event)
            return c.json({ error: "イベントが見つかりません" }, 404);
        const body = await c.req.json().catch(() => null);
        const parsed = UpdateEventSchema.safeParse(body);
        if (!parsed.success) {
            return c.json({ error: parsed.error.issues[0]?.message ?? "不正な入力です" }, 400);
        }
        const { title, datetime, capacity, deadline } = parsed.data;
        if (capacity !== undefined) {
            // 減員は不可: 現在の定員未満にはできない
            if (capacity < event.capacity) {
                return c.json({ error: "定員を減らすことはできません。増やすのみ可能です" }, 400);
            }
            // 現在の参加者数を下回ることも不可 (念のため)
            const attendCount = [...(rsvps.get(event.id)?.values() ?? [])].filter((r) => r.status === "attend").length;
            if (capacity < attendCount) {
                return c.json({ error: "定員は現在の参加者数を下回れません" }, 400);
            }
            event.capacity = capacity;
        }
        if (title !== undefined)
            event.title = title.trim();
        if (datetime !== undefined)
            event.datetime = new Date(datetime).toISOString();
        if (deadline !== undefined)
            event.deadline = new Date(deadline).toISOString();
        events.set(event.id, event);
        return c.json(toDetail(event));
    });
    // 出欠一覧
    app.get("/api/events/:id/rsvps", (c) => {
        const event = events.get(c.req.param("id"));
        if (!event)
            return c.json({ error: "イベントが見つかりません" }, 404);
        return c.json([...(rsvps.get(event.id)?.values() ?? [])]);
    });
    // 出欠回答: 要件4 (名前だけ) / 要件5 (3択) / 要件6 (締め切りまで何度でも・最後で上書き)
    app.post("/api/events/:id/rsvps", async (c) => {
        const event = events.get(c.req.param("id"));
        if (!event)
            return c.json({ error: "イベントが見つかりません" }, 404);
        const body = await c.req.json().catch(() => null);
        const parsed = UpsertRsvpSchema.safeParse(body);
        if (!parsed.success) {
            return c.json({ error: parsed.error.issues[0]?.message ?? "不正な入力です" }, 400);
        }
        const name = parsed.data.name.trim();
        const status = parsed.data.status;
        // 要件6: 締め切り後は変更不可
        if (now().getTime() > new Date(event.deadline).getTime()) {
            return c.json({ error: "締め切りを過ぎているため回答できません" }, 403);
        }
        const store = rsvps.get(event.id);
        const prev = store.get(name);
        // 定員チェック: 「参加」のみ定員に含める。「未定」「不参加」は含めない。
        // 同じ名前の上書きで、既に参加→参加の場合は定員消費は変わらないため許可。
        if (status === "attend" && prev?.status !== "attend") {
            const attendCount = [...store.values()].filter((r) => r.status === "attend").length;
            if (attendCount >= event.capacity) {
                return c.json({ error: "定員に達しているため参加で回答できません" }, 409);
            }
        }
        const rsvp = { name, status, updatedAt: now().toISOString() };
        store.set(name, rsvp);
        return c.json(rsvp, prev ? 200 : 201);
    });
    return app;
}
