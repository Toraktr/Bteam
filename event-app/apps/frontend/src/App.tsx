import { useEffect, useState } from "react";
import {
  answerRsvp,
  createEvent,
  formatDT,
  getEvent,
  increaseCapacity,
  listEvents,
  toInputValue,
  type EventDetail,
  type RsvpStatus,
} from "./api.js";

const STATUS_LABEL: Record<RsvpStatus, string> = {
  attend: "参加",
  decline: "不参加",
  maybe: "未定",
};

export function App() {
  const [events, setEvents] = useState<EventDetail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [message, setMessage] = useState("");

  const refreshList = async () => setEvents(await listEvents().catch(() => []));
  useEffect(() => {
    void refreshList();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    getEvent(selectedId).then(setDetail).catch(() => setDetail(null));
  }, [selectedId, events]);

  return (
    <main className="container">
      <h1>イベント出欠</h1>
      {message && <p className="message">{message}</p>}

      <section className="card">
        <h2>01: イベントを作る（主催者）</h2>
        <EventForm
          onCreated={async (id) => {
            setMessage("イベントを作成しました");
            await refreshList();
            setSelectedId(id);
          }}
        />
      </section>

      <section className="card">
        <h2>イベント一覧</h2>
        {events.length === 0 && <p>まだイベントがありません</p>}
        <ul>
          {events.map((e) => (
            <li key={e.id}>
              <button onClick={() => setSelectedId(e.id)}>
                {e.title}（{formatDT(e.datetime)}・定員{e.capacity}・残り{e.remaining}）
                {e.isClosed ? "【締切済】" : ""}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {detail && (
        <section className="card">
          <h2>02: 出欠を回答する（参加者）— {detail.title}</h2>
          <dl>
            <dt>開催日時</dt>
            <dd>{formatDT(detail.datetime)}</dd>
            <dt>定員 / 残り</dt>
            <dd>
              {detail.capacity} / {detail.remaining}（参加 {detail.counts.attend}・未定{" "}
              {detail.counts.maybe}・不参加 {detail.counts.decline}）
            </dd>
            <dt>回答締め切り</dt>
            <dd>
              {formatDT(detail.deadline)} {detail.isClosed && "【締切済：回答・変更不可】"}
            </dd>
          </dl>

          <CapacityForm
            detail={detail}
            onUpdated={async () => {
              setMessage("定員を増やしました");
              await refreshList();
              setDetail(await getEvent(detail.id));
            }}
          />
          <RsvpForm
            detail={detail}
            onAnswered={async () => {
              setMessage("回答を保存しました（締め切りまでは何度でも変更可）");
              await refreshList();
              setDetail(await getEvent(detail.id));
            }}
          />

          <h3>回答一覧</h3>
          <ul>
            {detail.rsvps.map((r) => (
              <li key={r.name}>
                {r.name}: {STATUS_LABEL[r.status]}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function EventForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [datetime, setDatetime] = useState(() => toInputValue(new Date().toISOString()));
  const [capacity, setCapacity] = useState(10);
  const [deadline, setDeadline] = useState(() => toInputValue(new Date().toISOString()));
  const [error, setError] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          const res = await createEvent({
            title,
            datetime: new Date(datetime).toISOString(),
            capacity: Number(capacity),
            deadline: new Date(deadline).toISOString(),
          });
          onCreated(res.id);
          setTitle("");
        } catch (err) {
          setError(err instanceof Error ? err.message : "作成に失敗しました");
        }
      }}
    >
      <label>
        タイトル <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        開催日時{" "}
        <input
          type="datetime-local"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          required
        />
      </label>
      <label>
        定員 <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required />
      </label>
      <label>
        回答締め切り（イベントごとに自由に設定）{" "}
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          required
        />
      </label>
      <button type="submit">作成</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

function CapacityForm({
  detail,
  onUpdated,
}: {
  detail: EventDetail;
  onUpdated: () => void;
}) {
  const [capacity, setCapacity] = useState(detail.capacity + 1);
  const [error, setError] = useState("");
  useEffect(() => setCapacity(detail.capacity + 1), [detail.capacity]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          await increaseCapacity(detail.id, Number(capacity));
          onUpdated();
        } catch (err) {
          setError(err instanceof Error ? err.message : "更新に失敗しました");
        }
      }}
    >
      <h3>定員を増やす（主催者）</h3>
      <label>
        新しい定員（現在 {detail.capacity}）{" "}
        <input
          type="number"
          min={detail.capacity}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
        />
      </label>
      <button type="submit">増やす</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

function RsvpForm({ detail, onAnswered }: { detail: EventDetail; onAnswered: () => void }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<RsvpStatus>("attend");
  const [error, setError] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          await answerRsvp(detail.id, name.trim(), status);
          onAnswered();
        } catch (err) {
          setError(err instanceof Error ? err.message : "回答に失敗しました");
        }
      }}
    >
      <h3>出欠回答（名前だけでOK・締め切りまで何度でも変更可）</h3>
      <label>
        名前 <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} />
      </label>
      <div role="radiogroup" aria-label="出欠">
        {(Object.keys(STATUS_LABEL) as RsvpStatus[]).map((s) => (
          <label key={s}>
            <input
              type="radio"
              name="status"
              checked={status === s}
              onChange={() => setStatus(s)}
            />
            {STATUS_LABEL[s]}
          </label>
        ))}
      </div>
      <button type="submit" disabled={detail.isClosed}>
        回答する（最後の回答で上書き）
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
