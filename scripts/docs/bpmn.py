"""Writes the BPMN 2.0 diagrams in docs/bpmn/ (with layout, so Camunda Modeler and bpmn.io open them).

Run: python3 scripts/docs/bpmn.py   (then scripts/docs/render.mjs makes the SVG pictures)

Each process is a pool with lanes (who does it); each node sits in a lane, a column and a row within
the lane. Flows are drawn as right-angled lines; flows back to an earlier step run under the pool.
"""
import os
import sys
from xml.sax.saxutils import escape

sys.path.insert(0, os.path.dirname(__file__))
from bpmn_fa import FA  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "bpmn")

COL_W, ROW_H, LANE_LABEL, X0 = 215, 140, 30, 70
SIZE = {"start": (36, 36), "end": (36, 36), "timer": (36, 36), "user": (160, 96), "service": (160, 96), "manual": (160, 96), "xor": (50, 50)}
TAG = {"start": "startEvent", "end": "endEvent", "timer": "startEvent", "user": "userTask", "service": "serviceTask", "manual": "manualTask", "xor": "exclusiveGateway"}


PROCESSES = []


def process(*args):
    """Records a process; it is written in English (docs/bpmn/) and Persian (docs/bpmn/fa/) at the end."""
    PROCESSES.append(args)


def write(lang, pid, name, lanes, nodes, flows, doc=""):
    """lanes: [(key, title)]; nodes: [(id, kind, label, lane, col, row)]; flows: [(from, to, label)]."""
    if lang == "fa":
        tr = lambda t: FA[t] if t else t  # noqa: E731 (a missing Persian label stops the script)
        name = tr(name)
        lanes = [(k, tr(title)) for k, title in lanes]
        nodes = [(n[0], n[1], tr(n[2]), *n[3:]) for n in nodes]
        flows = [(a, b, tr(label)) for a, b, label in flows]
    rows = {k: 1 + max([n[5] for n in nodes if n[3] == k] or [0]) for k, _ in lanes}
    lane_y, y = {}, 40
    for k, _ in lanes:
        lane_y[k] = y
        y += rows[k] * ROW_H
    pool_h = y - 40
    ncols = max(n[4] for n in nodes) + 1
    pool_w = LANE_LABEL + 40 + ncols * COL_W
    box = {}
    for nid, kind, label, lane, col, row in nodes:
        w, h = SIZE[kind]
        cx = X0 + LANE_LABEL + 40 + col * COL_W + 80
        cy = lane_y[lane] + row * ROW_H + ROW_H / 2
        box[nid] = (cx - w / 2, cy - h / 2, w, h)
    kinds = {n[0]: n[1] for n in nodes}
    outgoing = {n[0]: [] for n in nodes}
    incoming = {n[0]: [] for n in nodes}
    for i, (a, b, _) in enumerate(flows):
        outgoing[a].append(f"{pid}_f{i}")
        incoming[b].append(f"{pid}_f{i}")

    # ---- semantic model
    x = [f'  <bpmn:collaboration id="{pid}_collab">',
         f'    <bpmn:participant id="{pid}_pool" name="{escape(name)}" processRef="{pid}" />',
         '  </bpmn:collaboration>',
         f'  <bpmn:process id="{pid}" name="{escape(name)}" isExecutable="false">']
    if doc:
        x.append(f'    <bpmn:documentation>{escape(doc)}</bpmn:documentation>')
    x.append(f'    <bpmn:laneSet id="{pid}_lanes">')
    for k, title in lanes:
        x.append(f'      <bpmn:lane id="{pid}_lane_{k}" name="{escape(title)}">')
        x += [f'        <bpmn:flowNodeRef>{pid}_{n[0]}</bpmn:flowNodeRef>' for n in nodes if n[3] == k]
        x.append('      </bpmn:lane>')
    x.append('    </bpmn:laneSet>')
    for nid, kind, label, *_ in nodes:
        inner = "".join(f"<bpmn:incoming>{f}</bpmn:incoming>" for f in incoming[nid]) + "".join(
            f"<bpmn:outgoing>{f}</bpmn:outgoing>" for f in outgoing[nid])
        if kind == "timer":
            inner += f'<bpmn:timerEventDefinition id="{pid}_{nid}_timer" />'
        x.append(f'    <bpmn:{TAG[kind]} id="{pid}_{nid}" name="{escape(label)}">{inner}</bpmn:{TAG[kind]}>')
    for i, (a, b, label) in enumerate(flows):
        nm = f' name="{escape(label)}"' if label else ""
        x.append(f'    <bpmn:sequenceFlow id="{pid}_f{i}"{nm} sourceRef="{pid}_{a}" targetRef="{pid}_{b}" />')
    x.append('  </bpmn:process>')

    # ---- layout
    d = [f'  <bpmndi:BPMNDiagram id="{pid}_diagram">', f'    <bpmndi:BPMNPlane id="{pid}_plane" bpmnElement="{pid}_collab">',
         f'      <bpmndi:BPMNShape id="{pid}_pool_di" bpmnElement="{pid}_pool" isHorizontal="true"><dc:Bounds x="{X0}" y="40" width="{pool_w}" height="{pool_h}" /></bpmndi:BPMNShape>']
    for k, _ in lanes:
        d.append(f'      <bpmndi:BPMNShape id="{pid}_lane_{k}_di" bpmnElement="{pid}_lane_{k}" isHorizontal="true"><dc:Bounds x="{X0 + LANE_LABEL}" y="{lane_y[k]}" width="{pool_w - LANE_LABEL}" height="{rows[k] * ROW_H}" /></bpmndi:BPMNShape>')
    # Which sides of each node lines leave from: a gateway's name goes where no line is.
    centre = {k: (v[0] + v[2] / 2, v[1] + v[3] / 2) for k, v in box.items()}
    # A gateway's forward line nearest its own row leaves from the right corner; the others from the top
    # (target above) or bottom (target below). Lines back to an earlier step leave from the bottom.
    exit_side = {}
    for g in [n[0] for n in nodes if n[1] == "xor"]:
        fwd = [i for i, (a, b, _) in enumerate(flows) if a == g and centre[b][0] > centre[g][0]]
        fwd.sort(key=lambda i: abs(centre[flows[i][1]][1] - centre[g][1]))
        for k, i in enumerate(fwd):
            exit_side[i] = "right" if k == 0 else ("top" if centre[flows[i][1]][1] < centre[g][1] else "bottom")
    top_used = {flows[i][0] for i, side in exit_side.items() if side == "top"}
    bottom_used = {flows[i][0] for i, side in exit_side.items() if side == "bottom"} | {a for a, b, _ in flows if centre[b][0] <= centre[a][0]}
    for nid, kind, *_ in nodes:
        bx, by, w, h = box[nid]
        label = ""
        if kind in ("start", "end", "timer"):
            label = f'<bpmndi:BPMNLabel><dc:Bounds x="{bx - 40}" y="{by + h + 4}" width="{w + 80}" height="28" /></bpmndi:BPMNLabel>'
        elif kind == "xor":
            if nid not in top_used:
                lb = (bx - 45, by - 46, w + 90, 42)
            elif nid not in bottom_used:
                lb = (bx - 45, by + h + 4, w + 90, 28)
            else:
                lb = (bx - 112, by + 4, 108, 42)
            label = f'<bpmndi:BPMNLabel><dc:Bounds x="{lb[0]}" y="{lb[1]}" width="{lb[2]}" height="{lb[3]}" /></bpmndi:BPMNLabel>'
        marker = ' isMarkerVisible="true"' if kind == "xor" else ""
        d.append(f'      <bpmndi:BPMNShape id="{pid}_{nid}_di" bpmnElement="{pid}_{nid}"{marker}><dc:Bounds x="{bx}" y="{by}" width="{w}" height="{h}" />{label}</bpmndi:BPMNShape>')
    back = 0
    for i, (a, b, label) in enumerate(flows):
        ax, ay, aw, ah = box[a]
        bx, by, bw, bh = box[b]
        acx, acy, bcx, bcy = ax + aw / 2, ay + ah / 2, bx + bw / 2, by + bh / 2
        if bcx > acx:  # forward
            if abs(acy - bcy) < 1 and exit_side.get(i, "right") == "right":
                # Straight along the row, or under it when another node is in the way.
                blocked = any(abs((oy + oh / 2) - acy) < 1 and ox > ax + aw and ox + ow < bx for o, (ox, oy, ow, oh) in box.items() if o not in (a, b))
                if blocked:
                    dy = acy + 58
                    pts = [(acx, ay + ah), (acx, dy), (bcx, dy), (bcx, by + bh)]
                else:
                    pts = [(ax + aw, acy), (bx, bcy)]
            elif kinds[a] == "xor" and exit_side.get(i) in ("top", "bottom"):
                # A further branch leaves the gateway from its top or bottom corner, then runs across
                # (under the row when its target is on the same row).
                if abs(acy - bcy) < 1:
                    dy = acy + 62
                    pts = [(acx, ay + ah), (acx, dy), (bcx, dy), (bcx, by + bh)]
                else:
                    pts = [(acx, ay if bcy < acy else ay + ah), (acx, bcy), (bx, bcy)]
            else:
                mx = bx - 25
                pts = [(ax + aw, acy), (mx, acy), (mx, bcy), (bx, bcy)]
        else:  # back to an earlier step: under the pool, each entering the target at its own point
            back += 1
            ly = 40 + pool_h + 16 * back
            tx = bx + bw / 2 - 30 + ((back - 1) % 5) * 15
            pts = [(acx, ay + ah), (acx, ly), (tx, ly), (tx, by + bh)]
        wps = "".join(f'<di:waypoint x="{round(px)}" y="{round(py)}" />' for px, py in pts)
        lab = ""
        if label:
            if kinds[a] != "xor":
                lx, ly2 = pts[1][0] + 4, pts[1][1] + 2
            elif pts[0][1] == acy:  # straight out of the right corner: above the line
                lx, ly2 = pts[0][0] + 6, acy - 18
            elif pts[1][1] < pts[0][1]:  # up from the top corner
                lx, ly2 = acx + 6, ay - 20
            else:  # down from the bottom corner
                lx, ly2 = acx + 6, ay + ah + 4
            lab = f'<bpmndi:BPMNLabel><dc:Bounds x="{round(lx)}" y="{round(ly2)}" width="110" height="14" /></bpmndi:BPMNLabel>'
        d.append(f'      <bpmndi:BPMNEdge id="{pid}_f{i}_di" bpmnElement="{pid}_f{i}">{wps}{lab}</bpmndi:BPMNEdge>')
    d += ['    </bpmndi:BPMNPlane>', '  </bpmndi:BPMNDiagram>']

    xml = "\n".join([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" '
        'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" '
        f'id="{pid}_defs" targetNamespace="http://bpmn.io/schema/bpmn" exporter="procedures" exporterVersion="1">',
        *x, *d, '</bpmn:definitions>', ""])
    out = os.path.join(OUT, "fa") if lang == "fa" else OUT
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, f"{pid}.bpmn"), "w", encoding="utf-8") as f:
        f.write(xml)


os.makedirs(OUT, exist_ok=True)

# 1. Setting up a client company -------------------------------------------------------------------
process(
    "p1_company_setup", "1. Setting up a client company",
    [("pa", "System administrator"), ("sys", "System"), ("hr", "Company HR")],
    [
        ("s", "start", "New client company", "pa", 0, 0),
        ("t1", "user", "Create the company: name, sign-in address, evaluation mode, languages, first HR user", "pa", 1, 0),
        ("s1", "service", "Create the company with the default factors and the HR sign-in", "sys", 2, 0),
        ("t2", "manual", "Send HR the sign-in address and password", "pa", 3, 0),
        ("t3", "user", "Sign in, change the password, check settings and languages", "hr", 4, 0),
        ("e", "end", "Company ready", "hr", 5, 0),
    ],
    [("s", "t1", ""), ("t1", "s1", ""), ("s1", "t2", ""), ("t2", "t3", ""), ("t3", "e", "")],
    "The system administrator creates each client company; its first user has the HR role.",
)

# 2. Staff and users -------------------------------------------------------------------------------
process(
    "p2_staff_and_users", "2. Staff and user accounts",
    [("hr", "HR / CEO"), ("sys", "System"), ("st", "Staff member")],
    [
        ("s", "start", "New staff or yearly update", "hr", 0, 0),
        ("g1", "xor", "How?", "hr", 1, 0),
        ("tAdd", "user", "Add one person (staff form)", "hr", 2, 0),
        ("tPrep", "manual", "Prepare the Excel sheet in the 8 import columns", "hr", 2, 1),
        ("tImp", "user", "Import from Excel", "hr", 3, 1),
        ("sChk", "service", "Check rows; add or update by personnel no.; create departments; link supervisors", "sys", 4, 0),
        ("gErr", "xor", "Errors?", "sys", 5, 0),
        ("gM", "xor", "", "hr", 6, 0),
        ("gAcc", "xor", "Needs a sign-in?", "hr", 7, 0),
        ("tUser", "user", "Create the user: name, email, role, staff record, password", "hr", 8, 0),
        ("tSend", "manual", "Send the sign-in address and password", "hr", 9, 0),
        ("tSign", "user", "Sign in and change the password", "st", 10, 0),
        ("e1", "end", "Staff member can sign in", "st", 11, 0),
        ("e2", "end", "Staff recorded", "hr", 8, 1),
    ],
    [("s", "g1", ""), ("g1", "tAdd", "One person"), ("g1", "tPrep", "From Excel"), ("tPrep", "tImp", ""), ("tImp", "sChk", ""),
     ("sChk", "gErr", ""), ("gErr", "tPrep", "Yes: fix the rows"), ("gErr", "gM", "No"), ("tAdd", "gM", ""), ("gM", "gAcc", ""),
     ("gAcc", "tUser", "Yes"), ("gAcc", "e2", "No"), ("tUser", "tSend", ""), ("tSend", "tSign", ""), ("tSign", "e1", "")],
    "Managers and employees need a staff record linked to their account; people who leave are marked inactive, not deleted.",
)

# 3. Evaluation factors (spec v1.1, modes A and B) -------------------------------------------------
process(
    "p3_factor_setup", "3. Setting up the evaluation factors (spec v1.1)",
    [("hr", "HR / CEO"), ("sys", "System")],
    [
        ("s", "start", "Before the first half-year (reviewed every year)", "hr", 0, 0),
        ("g1", "xor", "Which mode?", "hr", 1, 0),
        ("a1", "user", "Mode A: enter the efficiency factors (titles)", "hr", 2, 0),
        ("a2", "user", "Weight each efficiency factor 1-10 (0 switches it off)", "hr", 3, 0),
        ("a3", "user", "Enter the effectiveness factors from the job descriptions", "hr", 4, 0),
        ("a4", "user", "Weight each effectiveness factor 1-10 (or 0)", "hr", 5, 0),
        ("b1", "service", "Mode B: load the 12 standard efficiency factors (titles locked, default total 60)", "sys", 2, 0),
        ("b2", "user", "Adjust the 12 weights 1-9 (0 leaves a factor out)", "hr", 3, 1),
        ("gB", "xor", "Effectiveness pattern?", "hr", 4, 1),
        ("b3", "user", "Weight the 4 standard factors: results, key expectations, impact, quality", "hr", 5, 1),
        ("gBm", "xor", "", "hr", 6, 1),
        ("gm", "xor", "", "hr", 7, 0),
        ("t1", "user", "Set the efficiency / effectiveness split (default 50/50, e.g. 75/25)", "hr", 8, 0),
        ("s1", "service", "Normalize the weights; check every group", "sys", 9, 0),
        ("e", "end", "Factors ready for the next half-year", "sys", 10, 0),
    ],
    [("s", "g1", ""), ("g1", "a1", "A: own factors"), ("g1", "b1", "B: standard"), ("a1", "a2", ""), ("a2", "a3", ""), ("a3", "a4", ""), ("a4", "gm", ""),
     ("b1", "b2", ""), ("b2", "gB", ""), ("gB", "b3", "4 standard factors"), ("gB", "gBm", "0-25 band score"), ("b3", "gBm", ""), ("gBm", "gm", ""),
     ("gm", "t1", ""), ("t1", "s1", ""), ("s1", "e", "")],
    "Spec v1.1 sections 2-4. A half-year keeps a copy of the factors, so later changes never alter it.",
)

# 4. The half-year evaluation ----------------------------------------------------------------------
process(
    "p4_half_year_evaluation", "4. Half-year performance evaluation",
    [("hr", "HR"), ("sup", "Supervisor"), ("mgr", "Unit manager"), ("brd", "CEO / board"), ("sys", "System")],
    [
        ("s", "timer", "Half-year ends (31 Shahrivar / end of Esfand)", "hr", 0, 0),
        ("t1", "user", "Open the half-year", "hr", 1, 0),
        ("s1", "service", "Copy the factors; add eligible staff (full-time, 3+ months); deadline = end + 20 days", "sys", 2, 0),
        ("t2", "user", "Score each team member 1-5 per factor (and effectiveness)", "sup", 3, 0),
        ("g1", "xor", "Every score in?", "sup", 4, 0),
        ("t3", "user", "Send for approval", "sup", 5, 0),
        ("g2", "xor", "Unit manager above the supervisor?", "sys", 6, 0),
        ("t4", "user", "Review and approve", "mgr", 7, 0),
        ("g3", "xor", "Approved?", "mgr", 8, 0),
        ("t5", "user", "Final approval (one by one or all waiting)", "brd", 9, 0),
        ("g4", "xor", "Approved?", "brd", 10, 0),
        ("s2", "service", "Calculate the results; check for two half-years under 50 % (process 5)", "sys", 11, 0),
        ("g5", "xor", "Everyone approved?", "hr", 12, 0),
        ("t6", "user", "Close the half-year", "hr", 13, 0),
        ("e", "end", "Results final", "hr", 14, 0),
    ],
    [("s", "t1", ""), ("t1", "s1", ""), ("s1", "t2", ""), ("t2", "g1", ""), ("g1", "t2", "No: keep scoring"), ("g1", "t3", "Yes"), ("t3", "g2", ""),
     ("g2", "t4", "Yes"), ("g2", "t5", "No"), ("t4", "g3", ""), ("g3", "t2", "No: send back"), ("g3", "t5", "Yes"), ("t5", "g4", ""),
     ("g4", "t2", "No: send back"), ("g4", "s2", "Yes"), ("s2", "g5", ""), ("g5", "t2", "No: HR chases"), ("g5", "t6", "Yes"), ("t6", "e", "")],
    "HR-WI-01 section 5 and spec v1.1. Nobody scores or approves their own evaluation.",
)

# 5. Two half-years under 50 % ---------------------------------------------------------------------
process(
    "p5_poor_performance", "5. Poor performance follow-up",
    [("sys", "System"), ("hr", "HR, with the supervisor, unit manager and CEO")],
    [
        ("s", "start", "The board approves a score", "sys", 0, 0),
        ("g1", "xor", "Under 50 %?", "sys", 1, 0),
        ("s1", "service", "Record poor performance", "sys", 2, 0),
        ("g2", "xor", "Previous half-year also under 50 %?", "sys", 3, 0),
        ("s2", "service", "Alert HR", "sys", 4, 0),
        ("t1", "manual", "Meeting on continuing employment", "hr", 5, 0),
        ("g3", "xor", "Decision", "hr", 6, 0),
        ("t2", "manual", "Record the decision and an improvement plan", "hr", 7, 0),
        ("t3", "user", "End employment: untick Active (history kept)", "hr", 7, 1),
        ("t4", "user", "Mark the alert done", "hr", 8, 0),
        ("e1", "end", "Followed up", "hr", 9, 0),
        ("e2", "end", "No action", "sys", 4, 1),
    ],
    [("s", "g1", ""), ("g1", "s1", "Yes"), ("g1", "e2", "No"), ("s1", "g2", ""), ("g2", "s2", "Yes"), ("g2", "e2", "No"), ("s2", "t1", ""), ("t1", "g3", ""),
     ("g3", "t2", "Continue"), ("g3", "t3", "End cooperation"), ("t2", "t4", ""), ("t3", "t4", ""), ("t4", "e1", "")],
    "HR-WI-01 5-3 and spec v1.1 section 5. Under 50 % also means no bonus that year.",
)

# 6. Salary and bonus ------------------------------------------------------------------------------
process(
    "p6_salary_and_bonus", "6. Yearly salary and bonus",
    [("brd", "CEO / board"), ("hr", "HR"), ("sys", "System")],
    [
        ("s", "timer", "New Persian year (salaries due 31 Farvardin)", "brd", 0, 0),
        ("t1", "user", "Set the minimum wage, maximum salary and bonus base (A = max - min)", "brd", 1, 0),
        ("t2", "user", "Open the salary year", "hr", 2, 0),
        ("s1", "service", "Copy last year's factors with one more year of experience", "sys", 3, 0),
        ("t3", "user", "Per person: education, experience, skill, job difficulty, rank and sensitivity", "hr", 4, 0),
        ("s2", "service", "Add last year's average performance; calculate salary and bonus; flag above-maximum", "sys", 5, 0),
        ("g1", "xor", "On probation?", "brd", 6, 0),
        ("t4", "user", "Give the CEO score (0-20 %)", "brd", 7, 0),
        ("t5", "user", "Set the probation salary (not below the minimum wage)", "brd", 7, 1),
        ("gm", "xor", "", "brd", 8, 0),
        ("g2", "xor", "Salary right?", "brd", 9, 0),
        ("t6", "user", "Approve (one by one or all complete)", "brd", 10, 0),
        ("t7", "user", "Close the salary year", "brd", 11, 0),
        ("e", "end", "Salaries and bonuses paid", "brd", 12, 0),
    ],
    [("s", "t1", ""), ("t1", "t2", ""), ("t2", "s1", ""), ("s1", "t3", ""), ("t3", "s2", ""), ("s2", "g1", ""), ("g1", "t4", "No"), ("g1", "t5", "Yes"),
     ("t4", "gm", ""), ("t5", "gm", ""), ("gm", "g2", ""), ("g2", "t3", "No: revise"), ("g2", "t6", "Yes"), ("t6", "t7", ""), ("t7", "e", "")],
    "Salary instruction: salary = minimum wage + A x (education + experience + skill + difficulty + grade + performance + CEO score).",
)
for lang in ("en", "fa"):
    for args in PROCESSES:
        write(lang, *args)
print("written to", os.path.normpath(OUT), "and", os.path.normpath(os.path.join(OUT, "fa")))
