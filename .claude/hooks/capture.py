#!/usr/bin/env python3
"""Agent capture hook for the 8x assignment.

Wired in .claude/settings.json:
  UserPromptSubmit -> capture.py prompt    (logs the prompt, verbatim)
  Stop             -> capture.py response  (logs the final assistant message of the turn)

One file per session in .agent-logs/, named YYYY-MM-DD_HH-MM-SS_<session-id>.md.
Entries are append-only; only the frontmatter counters are refreshed on each write.
The hook never blocks the agent: any failure is written to .agent-logs/.capture-errors.log.
"""
import datetime
import fcntl
import glob
import json
import os
import re
import sys
import time
import traceback

AUTHOR = "Ayushkhatidev"
TOOL = "claude-code"
PROJECT = "amazonclone"

# A real entry header is a whole line followed by timestamp/model lines. Anchoring matters:
# prompts can quote example log entries (the 8x brief does), which must not be counted.
ENTRY_RE = re.compile(
    r"^\[LOG_ENTRY type=(PROMPT|RESPONSE) num=(\d+) session=\S+\]\ntimestamp: (\S+)\nmodel: (\S+)$", re.M
)


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def log_dir(cwd):
    root = os.environ.get("CLAUDE_PROJECT_DIR") or cwd or os.getcwd()
    d = os.path.join(root, ".agent-logs")
    os.makedirs(d, exist_ok=True)
    return d


def read_transcript(path):
    entries = []
    if not path or not os.path.exists(path):
        return entries
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return entries


def blocks(entry):
    c = (entry.get("message") or {}).get("content")
    if isinstance(c, str):
        return [{"type": "text", "text": c}]
    return [b for b in (c or []) if isinstance(b, dict)]


def is_real_prompt(entry):
    if entry.get("type") != "user" or entry.get("isMeta") or entry.get("isCompactSummary"):
        return False
    bs = blocks(entry)
    return bool(bs) and not any(b.get("type") == "tool_result" for b in bs)


def latest_model(entries):
    for e in reversed(entries):
        if e.get("type") == "assistant":
            m = (e.get("message") or {}).get("model")
            if m and m != "<synthetic>":
                return m
    return None


def final_response(entries):
    """Text of the last assistant message in the current turn (after the last tool result)."""
    start = 0
    for i, e in enumerate(entries):
        if is_real_prompt(e):
            start = i
    texts, ts, model = [], None, None
    for e in entries[start + 1:]:
        if e.get("type") == "user" and any(b.get("type") == "tool_result" for b in blocks(e)):
            texts = []  # anything before a tool call is intermediate, not final
            continue
        if e.get("type") != "assistant":
            continue
        t = [b.get("text", "") for b in blocks(e) if b.get("type") == "text" and b.get("text", "").strip()]
        if t:
            texts.extend(t)
            ts = e.get("timestamp")
            model = (e.get("message") or {}).get("model") or model
    return "\n\n".join(texts), ts, model


def session_file(d, session_id):
    existing = sorted(glob.glob(os.path.join(d, f"*_{session_id}.md")))
    if existing:
        return existing[0]
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    return os.path.join(d, f"{stamp}_{session_id}.md")


def render_header(session_id, model, total, first, last):
    date = (first or now_iso())[:10]
    return (
        "---\n"
        f"session_id: {session_id}\n"
        f"date: {date}\n"
        f"author: {AUTHOR}\n"
        f"model: {model}\n"
        f"tool: {TOOL}\n"
        f"project: {PROJECT}\n"
        f"total_exchanges: {total}\n"
        f"first_prompt_time: {first}\n"
        f"last_prompt_time: {last}\n"
        "---\n\n"
        f"# Session Log - {date}\n\n"
        f"Session: `{session_id[:8]}` | Project: `{PROJECT}` | Author: `{AUTHOR}`\n\n"
        "---\n"
    )


def entry_text(kind, num, session_id, ts, model, body):
    return (
        f"\n\n\n[LOG_ENTRY type={kind} num={num} session={session_id[:8]}]\n"
        f"timestamp: {ts}\n"
        f"model: {model}\n\n"
        f"{body.rstrip()}\n"
    )


def append(path, session_id, new_entries):
    """Append entries and refresh the frontmatter; entry bodies are never rewritten."""
    body = ""
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            content = f.read()
        idx = content.find("\n[LOG_ENTRY")
        body = content[idx:] if idx >= 0 else ""
    body = body.rstrip("\n") + "".join(new_entries)
    found = ENTRY_RE.findall(body)
    prompts = [(ts, m) for kind, _, ts, m in found if kind == "PROMPT"]
    models = [m for _, _, _, m in found]
    distinct = [m for i, m in enumerate(models) if m not in models[:i] and m != "unknown"]
    header = render_header(
        session_id,
        ", ".join(distinct) or "unknown",
        len(prompts),
        prompts[0][0] if prompts else "",
        prompts[-1][0] if prompts else "",
    )
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(header + ("\n" + body.lstrip("\n") if body else ""))
    os.replace(tmp, path)


def count(path, kind):
    if not os.path.exists(path):
        return 0
    with open(path, encoding="utf-8") as f:
        return sum(1 for k, *_ in ENTRY_RE.findall(f.read()) if k == kind)


def backfill(session_id, entries):
    """If the hook was installed mid-session, recover the earlier exchanges from the transcript."""
    out, num = [], 0
    prompt_idxs = [i for i, e in enumerate(entries) if is_real_prompt(e)]
    for n, i in enumerate(prompt_idxs):
        num += 1
        e = entries[i]
        text = "\n".join(b.get("text", "") for b in blocks(e) if b.get("type") == "text")
        nxt = prompt_idxs[n + 1] if n + 1 < len(prompt_idxs) else len(entries)
        seg = entries[i:nxt]
        model = latest_model(seg) or latest_model(entries[:i]) or "unknown"
        out.append(entry_text("PROMPT", num, session_id, e.get("timestamp"), model,
                              "(backfilled from session transcript: hook installed mid-session)\n\n" + text))
        resp, ts, rmodel = final_response(seg)
        if resp:
            out.append(entry_text("RESPONSE", num, session_id, ts, rmodel or model,
                                  "(backfilled from session transcript: hook installed mid-session)\n\n" + resp))
    return out, num


def handle(mode, data):
    session_id = data.get("session_id") or "unknown-session"
    d = log_dir(data.get("cwd"))
    lock = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".capture.lock"), "w")
    fcntl.flock(lock, fcntl.LOCK_EX)
    path = session_file(d, session_id)
    transcript = data.get("transcript_path")

    if mode == "prompt":
        entries = read_transcript(transcript)
        new = []
        if not os.path.exists(path):
            # The current prompt is not yet in the transcript when this hook runs,
            # so anything already there is from before the hook was installed.
            new, _ = backfill(session_id, entries)
        num = count(path, "PROMPT") + sum(1 for x in new if "type=PROMPT" in x) + 1
        model = data.get("model")
        if isinstance(model, dict):
            model = model.get("id") or model.get("display_name")
        if not model:
            model = latest_model(entries)
        model = model or os.environ.get("ANTHROPIC_MODEL") or "unknown"
        new.append(entry_text("PROMPT", num, session_id, now_iso(), model, data.get("prompt", "")))
        append(path, session_id, new)

    elif mode == "response":
        resp, ts, model = "", None, None
        # The transcript can lag the Stop event slightly; wait for the final text to land.
        for _ in range(20):
            entries = read_transcript(transcript)
            resp, ts, model = final_response(entries)
            last = next((e for e in reversed(entries) if e.get("type") in ("assistant", "user")), None)
            if resp and last and last.get("type") == "assistant":
                break
            time.sleep(0.25)
        if not os.path.exists(path):
            # Hook installed mid-turn: the prompt hook never ran, so rebuild from the transcript.
            new, _ = backfill(session_id, entries)
            if new:
                append(path, session_id, new)
            return
        if not resp:
            resp = data.get("last_assistant_message") or "(no text response captured for this turn)"
        num = count(path, "PROMPT") or 1
        if count(path, "RESPONSE") >= num:
            return  # already logged (e.g. Stop fired twice for the same turn)
        model = model or latest_model(entries) or "unknown"
        # On the first prompt of a session no model is known yet at prompt time; the hook
        # fills it in on this same turn's PROMPT entry once the response reveals it.
        with open(path, encoding="utf-8") as f:
            content = f.read()
        last = [m for m in ENTRY_RE.finditer(content) if m.group(1) == "PROMPT" and m.group(2) == str(num)]
        if last and last[-1].group(4) == "unknown" and model != "unknown":
            m = last[-1]
            content = content[:m.start(4)] + model + content[m.end(4):]
            with open(path + ".tmp", "w", encoding="utf-8") as f:
                f.write(content)
            os.replace(path + ".tmp", path)
        append(path, session_id, [entry_text("RESPONSE", num, session_id, now_iso(), model, resp)])


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    raw = sys.stdin.read()
    try:
        handle(mode, json.loads(raw or "{}"))
    except Exception:
        try:
            d = log_dir(None)
            with open(os.path.join(d, ".capture-errors.log"), "a", encoding="utf-8") as f:
                f.write(f"{now_iso()} mode={mode}\n{traceback.format_exc()}\nraw payload:\n{raw}\n\n")
        except Exception:
            pass
    sys.exit(0)


if __name__ == "__main__":
    main()
