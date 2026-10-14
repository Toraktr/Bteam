import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { answerRsvp, createEvent, formatDT, getEvent, increaseCapacity, listEvents, toInputValue, } from "./api.js";
const STATUS_LABEL = {
    attend: "参加",
    decline: "不参加",
    maybe: "未定",
};
export function App() {
    const [events, setEvents] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
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
    return (_jsxs("main", { className: "container", children: [_jsx("h1", { children: "\u30A4\u30D9\u30F3\u30C8\u51FA\u6B20" }), message && _jsx("p", { className: "message", children: message }), _jsxs("section", { className: "card", children: [_jsx("h2", { children: "01: \u30A4\u30D9\u30F3\u30C8\u3092\u4F5C\u308B\uFF08\u4E3B\u50AC\u8005\uFF09" }), _jsx(EventForm, { onCreated: async (id) => {
                            setMessage("イベントを作成しました");
                            await refreshList();
                            setSelectedId(id);
                        } })] }), _jsxs("section", { className: "card", children: [_jsx("h2", { children: "\u30A4\u30D9\u30F3\u30C8\u4E00\u89A7" }), events.length === 0 && _jsx("p", { children: "\u307E\u3060\u30A4\u30D9\u30F3\u30C8\u304C\u3042\u308A\u307E\u305B\u3093" }), _jsx("ul", { children: events.map((e) => (_jsx("li", { children: _jsxs("button", { onClick: () => setSelectedId(e.id), children: [e.title, "\uFF08", formatDT(e.datetime), "\u30FB\u5B9A\u54E1", e.capacity, "\u30FB\u6B8B\u308A", e.remaining, "\uFF09", e.isClosed ? "【締切済】" : ""] }) }, e.id))) })] }), detail && (_jsxs("section", { className: "card", children: [_jsxs("h2", { children: ["02: \u51FA\u6B20\u3092\u56DE\u7B54\u3059\u308B\uFF08\u53C2\u52A0\u8005\uFF09\u2014 ", detail.title] }), _jsxs("dl", { children: [_jsx("dt", { children: "\u958B\u50AC\u65E5\u6642" }), _jsx("dd", { children: formatDT(detail.datetime) }), _jsx("dt", { children: "\u5B9A\u54E1 / \u6B8B\u308A" }), _jsxs("dd", { children: [detail.capacity, " / ", detail.remaining, "\uFF08\u53C2\u52A0 ", detail.counts.attend, "\u30FB\u672A\u5B9A", " ", detail.counts.maybe, "\u30FB\u4E0D\u53C2\u52A0 ", detail.counts.decline, "\uFF09"] }), _jsx("dt", { children: "\u56DE\u7B54\u7DE0\u3081\u5207\u308A" }), _jsxs("dd", { children: [formatDT(detail.deadline), " ", detail.isClosed && "【締切済：回答・変更不可】"] })] }), _jsx(CapacityForm, { detail: detail, onUpdated: async () => {
                            setMessage("定員を増やしました");
                            await refreshList();
                            setDetail(await getEvent(detail.id));
                        } }), _jsx(RsvpForm, { detail: detail, onAnswered: async () => {
                            setMessage("回答を保存しました（締め切りまでは何度でも変更可）");
                            await refreshList();
                            setDetail(await getEvent(detail.id));
                        } }), _jsx("h3", { children: "\u56DE\u7B54\u4E00\u89A7" }), _jsx("ul", { children: detail.rsvps.map((r) => (_jsxs("li", { children: [r.name, ": ", STATUS_LABEL[r.status]] }, r.name))) })] }))] }));
}
function EventForm({ onCreated }) {
    const [title, setTitle] = useState("");
    const [datetime, setDatetime] = useState(() => toInputValue(new Date().toISOString()));
    const [capacity, setCapacity] = useState(10);
    const [deadline, setDeadline] = useState(() => toInputValue(new Date().toISOString()));
    const [error, setError] = useState("");
    return (_jsxs("form", { onSubmit: async (e) => {
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
            }
            catch (err) {
                setError(err instanceof Error ? err.message : "作成に失敗しました");
            }
        }, children: [_jsxs("label", { children: ["\u30BF\u30A4\u30C8\u30EB ", _jsx("input", { value: title, onChange: (e) => setTitle(e.target.value), required: true })] }), _jsxs("label", { children: ["\u958B\u50AC\u65E5\u6642", " ", _jsx("input", { type: "datetime-local", value: datetime, onChange: (e) => setDatetime(e.target.value), required: true })] }), _jsxs("label", { children: ["\u5B9A\u54E1 ", _jsx("input", { type: "number", min: 1, value: capacity, onChange: (e) => setCapacity(Number(e.target.value)), required: true })] }), _jsxs("label", { children: ["\u56DE\u7B54\u7DE0\u3081\u5207\u308A\uFF08\u30A4\u30D9\u30F3\u30C8\u3054\u3068\u306B\u81EA\u7531\u306B\u8A2D\u5B9A\uFF09", " ", _jsx("input", { type: "datetime-local", value: deadline, onChange: (e) => setDeadline(e.target.value), required: true })] }), _jsx("button", { type: "submit", children: "\u4F5C\u6210" }), error && _jsx("p", { className: "error", children: error })] }));
}
function CapacityForm({ detail, onUpdated, }) {
    const [capacity, setCapacity] = useState(detail.capacity + 1);
    const [error, setError] = useState("");
    useEffect(() => setCapacity(detail.capacity + 1), [detail.capacity]);
    return (_jsxs("form", { onSubmit: async (e) => {
            e.preventDefault();
            setError("");
            try {
                await increaseCapacity(detail.id, Number(capacity));
                onUpdated();
            }
            catch (err) {
                setError(err instanceof Error ? err.message : "更新に失敗しました");
            }
        }, children: [_jsx("h3", { children: "\u5B9A\u54E1\u3092\u5897\u3084\u3059\uFF08\u4E3B\u50AC\u8005\uFF09" }), _jsxs("label", { children: ["\u65B0\u3057\u3044\u5B9A\u54E1\uFF08\u73FE\u5728 ", detail.capacity, "\uFF09", " ", _jsx("input", { type: "number", min: detail.capacity, value: capacity, onChange: (e) => setCapacity(Number(e.target.value)) })] }), _jsx("button", { type: "submit", children: "\u5897\u3084\u3059" }), error && _jsx("p", { className: "error", children: error })] }));
}
function RsvpForm({ detail, onAnswered }) {
    const [name, setName] = useState("");
    const [status, setStatus] = useState("attend");
    const [error, setError] = useState("");
    return (_jsxs("form", { onSubmit: async (e) => {
            e.preventDefault();
            setError("");
            try {
                await answerRsvp(detail.id, name.trim(), status);
                onAnswered();
            }
            catch (err) {
                setError(err instanceof Error ? err.message : "回答に失敗しました");
            }
        }, children: [_jsx("h3", { children: "\u51FA\u6B20\u56DE\u7B54\uFF08\u540D\u524D\u3060\u3051\u3067OK\u30FB\u7DE0\u3081\u5207\u308A\u307E\u3067\u4F55\u5EA6\u3067\u3082\u5909\u66F4\u53EF\uFF09" }), _jsxs("label", { children: ["\u540D\u524D ", _jsx("input", { value: name, onChange: (e) => setName(e.target.value), required: true, maxLength: 50 })] }), _jsx("div", { role: "radiogroup", "aria-label": "\u51FA\u6B20", children: Object.keys(STATUS_LABEL).map((s) => (_jsxs("label", { children: [_jsx("input", { type: "radio", name: "status", checked: status === s, onChange: () => setStatus(s) }), STATUS_LABEL[s]] }, s))) }), _jsx("button", { type: "submit", disabled: detail.isClosed, children: "\u56DE\u7B54\u3059\u308B\uFF08\u6700\u5F8C\u306E\u56DE\u7B54\u3067\u4E0A\u66F8\u304D\uFF09" }), error && _jsx("p", { className: "error", children: error })] }));
}
