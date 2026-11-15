"""Build the PULSE project report from English source and pinned repository evidence.

Dependencies: reportlab, Pillow, pypdf (provided by the Codex document runtime).
Run from any directory: python people/angelos/report/build_report.py
"""
from __future__ import annotations

import csv
import hashlib
import html
import json
import os
import re
import subprocess
from collections import Counter
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from statistics import median
from urllib.parse import quote

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, Image, KeepTogether, NextPageTemplate,
    PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
COMMIT = 'b0f968c156927a52cf2607a2d548ce4cd078b862'
GITHUB = 'https://github.com/Tilihub/space-apps-2026'
PDF = HERE / 'PULSE_Project_Report.pdf'
NAVY = colors.HexColor('#153447')
CYAN = colors.HexColor('#16899b')
GRAY = colors.HexColor('#5d6670')
LIGHT = colors.HexColor('#f1f5f7')
BORDER = colors.HexColor('#d9d9d9')
WIDTH, HEIGHT = A4
MARGIN = 50
CONTENT_W = WIDTH - 2 * MARGIN

REF_PATHS = [
    'shared/PLAN.md',
    'integration/onboard-app/README.md',
    'people/tommy/current-app-handoff.md',
    'people/angelos/report/evidence-manifest.json',
    'people/tommy/plan.md',
    'shared/research/gemini-health-monitoring-and-medical-care.md',
    'people/petros_the_space_larper/astronaut-deep-space-countermeasures.md',
    'shared/contract/README.md',
    'people/angelos/health/README.md',
    'people/tommy/contract-review.md',
    'shared/decisions/2026-11-15-1108-pulsars-personal-growth.md',
    'shared/decisions/2026-11-14-2235-offline-companion-review.md',
    'people/tommy/medical-training-follow-up.md',
    'people/tommy/wellbeing-questionnaire-proposal.md',
    'people/zt/demo-cases.md',
    'people/petros_the_space_larper/demo-data/stories.md',
    'people/petros_the_space_larper/demo-data/README.md',
    'people/potest/environmental-graphs/README.md',
    'integration/onboard-app/adapters/companion-support.js',
    'people/petros_the_space_larper/astronaut-inflight-data.md',
    'people/petros_the_space_larper/astronaut-physical-and-mental-health.md',
    'shared/sources.md',
    'people/petros_the_space_larper/astronaut-health-research.md',
    'people/petros_the_space_larper/astronaut-inflight-vitals.csv',
    'people/petros_the_space_larper/demo-data/scenarios.json',
    'people/angelos/health/DATA_REVIEW.md',
    'people/petros_the_space_larper/demo-data/measurement-guides.json',
    'people/potest/environmental-graphs/build_data.py',
    'integration/onboard-app/adapters/environment.js',
    'people/potest/environmental-graphs/alerts.js',
    'people/angelos/health/analysis.js',
    'people/angelos/health_monitor/BASELINE_IMPORT.md',
    'people/angelos/health_monitor/README.md',
    'people/potest/crew-support/companion.js',
    'people/potest/crew-support/companion-client.js',
    'integration/crew-assistant/replies.mjs',
    'integration/onboard-app/adapters/mind.js',
    'integration/onboard-app/modules.js',
    'integration/onboard-app/server.js',
    'people/dadis2/meds/README.md',
    'people/dadis2/meds/rules.js',
    'people/dadis2/inventory/CONTRACT.md',
    'people/petros_the_space_larper/demo-data/WORKOUT.md',
    'shared/contract/pulsars.md',
    'people/tommy/pulsars/README.md',
    'integration/onboard-app/adapters/reports.js',
    'people/angelos/report/validation.txt',
    'AGENTS.md',
]
WEB_REFS = {
    'W01': ('NASA Publications Guide for Authors', 'https://ntrs.nasa.gov/citations/20150013303',
            'NASA/SP-2015-7602 Revision 2, June 2015. Section 4 informed the report organization.'),
    'W02': ('NASA Five Hazards of Human Spaceflight', 'https://www.nasa.gov/hrp/hazards/',
            'Primary context for the challenge and the joined health and habitat view.'),
    'W03': ('NASA Medical Operations', 'https://www.nasa.gov/reference/6-0-medical-operations/',
            'Primary context for private medical and psychological communication.'),
    'W04': ('PhysioNet BIDMC PPG and Respiration Dataset version 1.0.0',
            'https://physionet.org/content/bidmc/1.0.0/',
            'Primary dataset page. Terrestrial signals and numerics; replay research, not astronaut training data.'),
}


@lru_cache(maxsize=None)
def pinned_blob(path):
    return subprocess.run(['git', 'show', f'{COMMIT}:{path}'], cwd=ROOT,
                          check=True, capture_output=True).stdout


def read(path):
    if path.startswith('people/angelos/report/'):
        return (ROOT / path).read_text(encoding='utf-8-sig')
    return pinned_blob(path).decode('utf-8-sig')


def pinned_image(path):
    target = HERE/'.qa'/'assets'/Path(path).name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(pinned_blob(path))
    return target


def repo_url(path, pinned=True):
    # New report artifacts do not exist at the application snapshot.
    revision = COMMIT if pinned and not path.startswith('people/angelos/report/') else 'main'
    return f'{GITHUB}/blob/{revision}/{quote(path, safe="/")}'


def register_fonts():
    win = Path(os.environ.get('WINDIR', r'C:\Windows')) / 'Fonts'
    candidates = [
        ('Body', win / 'arial.ttf'), ('BodyBold', win / 'arialbd.ttf'),
        ('BodyItalic', win / 'ariali.ttf'), ('Mono', win / 'consola.ttf'),
    ]
    for name, file in candidates:
        if not file.exists():
            raise RuntimeError(f'Required report font not found: {file}')
        pdfmetrics.registerFont(TTFont(name, str(file)))
    pdfmetrics.registerFontFamily('Body', normal='Body', bold='BodyBold', italic='BodyItalic', boldItalic='BodyBold')


def inline(text):
    text = html.escape(str(text), quote=False)
    text = text.replace('&lt;br/&gt;', '<br/>')
    text = text.translate(str.maketrans({'\u2011':'-', '\u2010':'-', '\u2013':'-', '\u2014':'-'}))
    text = text.translate(str.maketrans('₀₁₂₃₄₅₆₇₈₉', '0123456789'))
    text = re.sub(r'\[([^\]]+)\]\((https?://[^\s)]+)\)',
                  lambda m: f'<link href="{html.escape(m[2], quote=True)}" color="#146777">{m[1]}</link>', text)
    text = re.sub(r'`([^`]+)`', r'<font name="Mono" size="9">\1</font>', text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)

    def ref(m):
        key = m[1]
        if key.startswith('R'):
            target = repo_url(REF_PATHS[int(key[1:]) - 1])
        else:
            target = WEB_REFS[key][1]
        return f'<link href="{html.escape(target, quote=True)}" color="#146777">[{key}]</link>'
    return re.sub(r'\[(R\d\d|W\d\d)\]', ref, text)


register_fonts()
styles = getSampleStyleSheet()
styles.add(ParagraphStyle('Text', fontName='Body', fontSize=11, leading=15.3, spaceAfter=8,
                          textColor=colors.black, splitLongWords=True, allowWidows=0, allowOrphans=0))
styles.add(ParagraphStyle('ReportH1', parent=styles['Text'], fontName='BodyBold', fontSize=17,
                          leading=21, spaceBefore=17, spaceAfter=10, keepWithNext=True))
styles.add(ParagraphStyle('ReportH2', parent=styles['Text'], fontName='BodyBold', fontSize=12.2,
                          leading=16, spaceBefore=11, spaceAfter=7, keepWithNext=True))
styles.add(ParagraphStyle('Small', parent=styles['Text'], fontSize=9.2, leading=12.2, spaceAfter=6))
styles.add(ParagraphStyle('Caption', parent=styles['Small'], textColor=GRAY, spaceBefore=6, spaceAfter=12))
styles.add(ParagraphStyle('Index', parent=styles['Small'], spaceAfter=3))
styles.add(ParagraphStyle('Cell', parent=styles['Small'], fontSize=9.3, leading=12.5, spaceAfter=0))
styles.add(ParagraphStyle('CellHeader', parent=styles['Cell'], fontName='BodyBold', textColor=colors.white))
styles.add(ParagraphStyle('CoverTitle', fontName='BodyBold', fontSize=29, leading=34,
                          alignment=TA_CENTER, textColor=colors.black, spaceAfter=14))
styles.add(ParagraphStyle('CoverSub', parent=styles['Text'], alignment=TA_CENTER, spaceAfter=12))
styles.add(ParagraphStyle('TOCEntry', parent=styles['Text'], fontSize=9.7, leading=12.4,
                          spaceBefore=1, spaceAfter=2, leftIndent=0, firstLineIndent=0))


def para(text, style='Text'):
    return Paragraph(inline(text), styles[style])


def heading(text, level=1):
    return para(text, 'ReportH1' if level == 1 else 'ReportH2')


def make_table(rows, widths=None, padding=7):
    if widths is None:
        if len(rows[0]) == 3:
            widths = [CONTENT_W * 0.22, CONTENT_W * 0.38, CONTENT_W * 0.40]
        elif len(rows[0]) == 6:
            widths = [CONTENT_W * .23] + [CONTENT_W * .154] * 5
        else:
            widths = [CONTENT_W / len(rows[0])] * len(rows[0])
    data = [[para(cell, 'CellHeader' if r == 0 else 'Cell') for cell in row] for r, row in enumerate(rows)]
    table = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT', splitByRow=True,
                  spaceBefore=5, spaceAfter=12)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT]),
        ('GRID', (0, 0), (-1, -1), .45, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), padding), ('BOTTOMPADDING', (0, 0), (-1, -1), padding),
    ]))
    return table


class Architecture(Flowable):
    def __init__(self):
        Flowable.__init__(self)
        self.width, self.height = CONTENT_W, 235

    def draw(self):
        c = self.canv

        def box(x, y, w, h, title, sub, fill=LIGHT):
            c.setFillColor(fill)
            c.setStrokeColor(BORDER)
            c.roundRect(x, y, w, h, 5, fill=1, stroke=1)
            c.setFillColor(colors.black)
            c.setFont('BodyBold', 10)
            c.drawCentredString(x+w/2, y+h-16, title)
            c.setFont('Body', 8.3)
            c.drawCentredString(x+w/2, y+10, sub)

        def arrow(x1, y1, x2, y2):
            c.setStrokeColor(CYAN)
            c.setLineWidth(1)
            c.line(x1, y1, x2, y2)
            c.line(x2, y2, x2-3, y2+5)
            c.line(x2, y2, x2+3, y2+5)

        w = (CONTENT_W-18)/3
        for i, (t, s) in enumerate([('Crew pages', 'Own routine and private features'),
                                    ('Medical officer', 'Clinical review and approvals'),
                                    ('Earth console', 'Delivered reports and replies')]):
            box(i*(w+9), 190, w, 43, t, s)
            arrow(i*(w+9)+w/2, 190, i*(w+9)+w/2, 169)
        box(0, 121, CONTENT_W, 48, 'One onboard Node.js core',
            'Sessions  |  permissions  |  mission clock  |  HTTP  |  events', colors.HexColor('#eaf4f6'))
        for i, (t, s) in enumerate([('Health', 'Reference and observations'), ('Meds', 'Grants and collection'),
                                    ('Mind', 'Journal and scripted support'), ('Environment', 'Archive and alerts'),
                                    ('Reports', 'Local delayed transport'), ('Pulsars', 'Private rewards and answers')]):
            x, y = (i % 3)*(w+9), 60-(i//3)*53
            box(x, y, w, 44, t, s)
        arrow(CONTENT_W/2, 121, CONTENT_W/2, 105)


class SleepChart(Flowable):
    def __init__(self, fixture):
        Flowable.__init__(self)
        self.width, self.height = CONTENT_W, 196
        self.rows = fixture['crew']['c4']['checkIns'] + [{'missionDay': 42, 'sleepHours': 4.6}]

    def draw(self):
        c = self.canv
        x0, y0, w, h = 37, 36, CONTENT_W-58, 124
        x = lambda day: x0 + (day-29)/13*w
        y = lambda val: y0 + (val-3)/6*h
        c.setFont('Body', 9)
        c.setStrokeColor(BORDER)
        for tick in range(3, 10):
            c.line(x0, y(tick), x0+w, y(tick))
            c.setFillColor(GRAY)
            c.drawRightString(x0-8, y(tick)-3, str(tick))
        c.setFont('Body', 8.5)
        for day in range(29, 43):
            c.drawCentredString(x(day), y0-14, str(day))
        c.drawCentredString(x0+w/2, 3, 'Mission day   |   fictional Tomas sleep history')
        for val, label, col in [(6.8, 'Fixed median 6.8 h', CYAN), (5.3, 'Lower demo boundary 5.3 h', GRAY)]:
            c.setStrokeColor(col)
            c.setDash(4, 3)
            c.line(x0, y(val), x0+w, y(val))
            c.setFillColor(col)
            c.drawString(x0+5, y(val)+4, label)
        c.setDash()
        c.setStrokeColor(NAVY)
        c.setLineWidth(1.7)
        path = c.beginPath()
        for i, row in enumerate(self.rows):
            if i == 0:
                path.moveTo(x(row['missionDay']), y(row['sleepHours']))
            else:
                path.lineTo(x(row['missionDay']), y(row['sleepHours']))
        c.drawPath(path)
        for row in self.rows:
            c.setFillColor(NAVY)
            c.circle(x(row['missionDay']), y(row['sleepHours']), 2.6, fill=1, stroke=0)
        c.setFillColor(colors.black)
        c.setFont('BodyBold', 9)
        c.drawString(x0, 180, 'Synthetic sleep observations in hours')
        c.drawRightString(x0+w, y(4.6)-14, 'Day 42   4.6 h')


class ReportDoc(BaseDocTemplate):
    def __init__(self, path):
        super().__init__(str(path), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                         topMargin=52, bottomMargin=48,
                         title='PULSE Health Monitoring for Mars Transit',
                         author='May the Pulse Be With You team',
                         subject='Project rationale data methods architecture AI use and verification',
                         pageCompression=1)
        frame = Frame(MARGIN, 48, CONTENT_W, HEIGHT-100, leftPadding=0, rightPadding=0,
                      topPadding=0, bottomPadding=0)
        self.addPageTemplates([PageTemplate(id='cover', frames=[frame], onPage=self.cover),
                               PageTemplate(id='body', frames=[frame], onPage=self.body)])

    def cover(self, canvas, doc):
        pass

    def body(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(colors.black)
        canvas.setFont('Body', 8)
        canvas.drawString(MARGIN, HEIGHT-31, 'PULSE  |  Project technical report')
        canvas.setFillColor(GRAY)
        canvas.setFont('Body', 7.5)
        canvas.drawString(MARGIN, 27, 'May the Pulse Be With You  |  PULSE TR 2026 01  |  15 November 2026')
        canvas.drawRightString(WIDTH-MARGIN, 27, str(doc.page))
        canvas.restoreState()

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == 'ReportH1':
            text = flowable.getPlainText()
            key = 'heading-' + hashlib.sha1(text.encode()).hexdigest()[:12]
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, 0, False)
            if text != 'Contents':
                self.notify('TOCEntry', (0, text, self.page, key))


def source_title(path):
    if path == 'shared/decisions/TEMPLATE.md':
        return 'Decision record template'
    if path.endswith('.md') and (ROOT/path).exists():
        for line in read(path).splitlines():
            if line.startswith('# '):
                return line[2:].strip()
    return Path(path).name


def references(story):
    story.append(heading('Repository evidence', 2))
    for i, path in enumerate(REF_PATHS, 1):
        title = source_title(path)
        story.append(para(f'**R{i:02d}** [{title}]({repo_url(path)}). {path}', 'Small'))
    story.append(heading('External primary references for this report', 2))
    for key, (title, url, desc) in WEB_REFS.items():
        story.append(para(f'**{key}** [{title}]({url}). {desc} Accessed 15 November 2026.', 'Small'))
    story.append(heading('Project source registry', 2))
    story.append(para('The following entries preserve the project source register. Their stated use is the team\'s recorded use; registration alone does not mean a dataset is loaded by the current app. The Gemini discovery surveys remain separately marked unverified in the research index.', 'Small'))
    count = 0
    section = ''
    for line in read('shared/sources.md').splitlines():
        if line.startswith('## '):
            section = line[3:]
            story.append(heading(section, 2))
        if not line.startswith('|'):
            continue
        cells = [x.strip() for x in line.strip('|').split('|')]
        if len(cells) != 4 or cells[0] in ['Source', '---'] or set(cells[0]) <= {'-', ':'}:
            continue
        count += 1
        name, link, use, owner = cells
        urls = re.findall(r'\[([^\]]+)\]\((https?://[^)]+)\)', link)
        links = ' '.join(f'[{label}]({url})' for label, url in urls) if urls else f'[Open source]({link})'
        story.append(para(f'**S{count:02d} {name}.** {use}. {links}. Registered by {owner}.', 'Small'))


def time_label(value, mode):
    if mode == 'utc':
        return datetime.fromtimestamp(value, timezone.utc).strftime('%Y-%m-%d %H:%M')
    return str(value)


def appendices(story, datasets, vitals, catalogue, fixture, manifest):
    story.append(PageBreak())
    story.append(heading('Appendix A Environmental dataset catalog'))
    total_points = sum(len(m['points']) for d in datasets for m in d['metrics'])
    total_samples = sum(p[2] for d in datasets for m in d['metrics'] for p in m['points'])
    story.append(para(f'The checked-in processed archive contains {len(datasets)} dataset groups, '
                      f'{sum(len(d["metrics"]) for d in datasets)} channels and {total_points:,} channel points. '
                      f'Those points represent {total_samples:,} contributing channel samples as counted by the builder. '
                      'Counts across channels may refer to simultaneous source records. They are not unique physical events. '
                      'All groups below are historical; the separate synthetic alert exercise is generated in alerts.js.'))
    for d in datasets:
        block = [heading(d['title'].replace('·', ''), 2)]
        block.append(para(f'ID {d["id"]}. {d["context"]}. Source [{d["source"]}]({d["url"]}). '
                         f'Time basis {d["timeMode"]}. {d.get("notes", "")}', 'Small'))
        rows = [['Metric and unit', 'Points', 'Source extent and processing']]
        for m in d['metrics']:
            pts = m['points']
            extent = f'{time_label(pts[0][0], d["timeMode"])} to {time_label(pts[-1][0], d["timeMode"])}'
            processing = f'Bucket {m["bucket"]} s; gap {m["gap"]} source-time units'
            rows.append([f'{m["title"]} ({m["unit"]})', f'{len(pts):,}', extent + '. ' + processing])
        block.append(make_table(rows, [CONTENT_W*.35, CONTENT_W*.12, CONTENT_W*.53]))
        story.append(KeepTogether(block))
    story.append(para('For LMST, numeric times are seconds within the selected sol; for InSight, numeric times and gap settings are in sol units. The stored bucket/gap values above are reported as encoded; source interpretation takes precedence over an assumed UTC interval.', 'Small'))

    story.append(PageBreak())
    story.append(heading('Appendix B Historical vital sign coverage'))
    story.append(para('These counts are computed from the 47-row historical CSV. Blank cells remain unavailable. Record types must remain attached to their values; a cohort summary is not one person\'s daily observation.'))
    story.append(make_table([['Mission label', 'Rows', 'Observation types']] + [
        [name, str(sum(r['mission']==name for r in vitals)),
         ', '.join(f'{k.replace("_", " ")} {v}' for k,v in Counter(r['observation_type'] for r in vitals if r['mission']==name).items())]
        for name in dict.fromkeys(r['mission'] for r in vitals)
    ], padding=5))
    fields = ['heart_rate_bpm', 'peak_heart_rate_bpm', 'respiratory_rate_breaths_per_min', 'spo2_pct',
              'systolic_bp_mmhg', 'diastolic_bp_mmhg', 'core_temperature_c']
    story.append(make_table([['Measurement column', 'Present', 'Blank']] + [
        [f.replace('_',' '), str(sum(bool(r[f]) for r in vitals)), str(sum(not r[f] for r in vitals))]
        for f in fields
    ], [CONTENT_W*.64, CONTENT_W*.18, CONTENT_W*.18], padding=5))
    story.append(heading('Published source locations retained by the CSV', 2))
    grouped = {}
    for r in vitals:
        grouped.setdefault(r['source_url'], []).append(r)
    for idx, (url, rows) in enumerate(grouped.items(), 1):
        missions = ', '.join(dict.fromkeys(r['mission'] for r in rows))
        locators = '; '.join(dict.fromkeys(r['source_locator'] for r in rows))
        story.append(para(f'**V{idx:02d}** {missions}. {len(rows)} CSV records. {locators}. [Original publication]({url}).', 'Small'))
    story.append(para(f'[Full CSV with all observations and source notes]({repo_url("people/petros_the_space_larper/astronaut-inflight-vitals.csv")}). The file is a transcription of published results and supplies none of the five fictional crew histories.', 'Small'))

    story.append(PageBreak())
    story.append(heading('Appendix C Medicine demonstration catalogue'))
    story.append(para('The following 21 entries are the sample catalogue used by the mounted medicine service. The labels/strengths and tiers document the demo, not a prescribing recommendation. Full stock lots, sample limits, allergies and seeded events remain in catalogue.json.'))
    rows = [['Item ID', 'Display name', 'Demo tier']]
    rows += [[i['id'], i['name'], i['tier']] for i in catalogue['items']]
    story.append(make_table(rows, [CONTENT_W*.36, CONTENT_W*.43, CONTENT_W*.21], padding=4))
    story.append(para(f'[Full sample catalogue]({repo_url("people/dadis2/meds/catalogue.json")}). AED is absent from this list because its visible shelf remains planned equipment.'))

    story.append(PageBreak())
    story.append(heading('Appendix D Decision and delivery chronology'))
    decisions = [
        ('Separate prototypes', 'Python comparison, browser inventory and offline environmental graphs established runnable pieces before shared-server integration.', 'R09 R18 R33 R42'),
        ('One shared contract', 'PR #49 aligned Node modules, identity, UTC time, fields, strict validation and care-only analysis. Earlier 0–10 histories stayed separate.', 'R08 R10'),
        ('Source selection and alignment', 'PET-1/PET-2 and stage-alignment work resolved differences in Tomas sleep and Ines missing pulse without changing real historical observations.', 'R17 R25 R26'),
        ('Core components delivered', 'Health #57, medicine #66/#70, exercise #63/#67 and server #71 supplied the components for composition.', 'R03 R09 R40 R43'),
        ('Offline companion selected', '14 November decision retained original support helpers and narrow synthetic context; it rejected describing scripts as a trained model.', 'R12 R19'),
        ('Connected app and visual refinement', 'PR #74 merged at 09:37:47 UTC on 15 November; #73 and companion #55 also show merged. Alloy/Inter, six instruments, body interaction and cabinet presentation are in the snapshot.', 'R03 R05 R13'),
        ('Personal Pulsars adopted in code', 'PR #75 merged at 09:38:35 UTC on 15 November. The snapshot includes private ten-answer persistence, routine rewards, PR records and cosmetic purchases.', 'R04 R11 R44 R45'),
    ]
    for title, detail, refs in decisions:
        story.append(heading(title, 2))
        story.append(para(detail + ' ' + ' '.join(f'[{r}]' for r in refs.split())))
    story.append(para('Merge timestamps are from the GitHub PR state read for this report. They establish delivery to the repository, not clinical acceptance or completeness of the project-page submission. The older personal plans/reviews remain historical records.'))

    story.append(PageBreak())
    story.append(heading('Appendix E Repository documentation index'))
    story.append(para('This index retains the written reasoning, research, proposals, reviews and handoffs across the source tree. It includes historical and superseded material. Read the main report for the current interpretation; use the pinned links for the complete original notes. Paths below are relative to each group heading. The manifest records full paths and SHA-256 digests for these files and the principal code/data inputs.'))
    docs = [x for x in manifest['files'] if x['path'].endswith('.md')]
    for group in ['shared/', 'people/angelos/', 'people/dadis2/', 'people/petros_the_space_larper/',
                  'people/potest/', 'people/tommy/', 'people/zt/', 'integration/', 'final/']:
        members = [x for x in docs if x['path'].startswith(group)]
        if not members:
            continue
        story.append(heading(group.replace('/', ' ').strip(), 2))
        for item in members:
            path = item['path']
            story.append(para(f'[{source_title(path)}]({repo_url(path)}). {path[len(group):]}', 'Index'))

    story.append(PageBreak())
    story.append(heading('Appendix F Reproducing the demonstration'))
    story.append(para('Use Node.js 24 or later in the project checkout. The backend uses built-in modules; no npm packages need to be installed. The older Crew Assistant bridge tests additionally require Python on PATH.'))
    for text in [
        'Start from the repository root with `node integration/onboard-app/start.js`, then open the URL it prints. The default port is 8000.',
        'Set `PULSE_DATA_DIR` to a separate absolute directory for an independent synthetic review store. Existing local stores are ignored by Git. A fresh store loads the canonical fixtures; do not reset another person\'s running demonstration.',
        'For the canonical stage cases, keep mission day 42 at 07:30 UTC. Submit only each scenario\'s checkInBody as that crew member. Use separate fresh stores/resets when reproducing cases independently.',
        'For a populated presentation, follow integration/onboard-app/demo/README.md and its seed-presentation.mjs instructions. Seeded Today values are different from a fresh live-entry walkthrough.',
        'Open crew, medical-officer and Earth sessions separately to demonstrate role restrictions, reusable credentials, delayed reports and private journal separation.',
        'Run `npm test`, whose package script is exactly `node --test "**/*.test.js"`. The report\'s direct invocation produced 117 passes. Use the repo\'s original test environment, including Python and localhost HTTP permissions.',
        'Rebuild this PDF with `python people/angelos/report/build_report.py` in an environment with ReportLab, Pillow and pypdf. The report records the application snapshot named on the cover, rather than claiming that later main changes are included.',
    ]:
        story.append(para(text))
    story.append(heading('Artifact provenance', 2))
    story.append(para('Report identifier PULSE TR 2026 01. Version 1.0. Date 15 November 2026. Application snapshot ' + COMMIT + '. Team logo reproduced unchanged from the application assets. The Overview image is an existing repository review export. Diagrams are generated from the documented architecture and synthetic fixture. The report text and build code were prepared with Codex assistance.'))


def manifest_for(datasets, vitals):
    tracked = subprocess.run(['git', 'ls-tree', '-r', '--name-only', COMMIT], cwd=ROOT,
                             check=True, capture_output=True, text=True).stdout.splitlines()
    selected = [p for p in tracked if p.endswith('.md') or p in REF_PATHS or p in [
        'people/potest/environmental-graphs/data/series.js',
        'people/petros_the_space_larper/demo-data/health.json',
        'people/dadis2/meds/catalogue.json', 'people/tommy/pulsars/index.js',
        'people/tommy/pulsars/catalog.js', 'people/angelos/health/index.js',
        'integration/onboard-app/pages/assets/team-logo.png']]
    files = []
    for path in selected:
        # Hash the pinned blob, so a later checkout cannot silently change the evidence snapshot.
        blob = pinned_blob(path)
        files.append({'path': path, 'sha256': hashlib.sha256(blob).hexdigest(), 'bytes':len(blob), 'url':repo_url(path)})
    return {'applicationCommit':COMMIT, 'reportDate':'2026-11-15', 'timezone':'Asia/Nicosia',
            'reportId':'PULSE TR 2026 01', 'reportVersion':'1.0',
            'validation':{'command':'node --test "**/*.test.js"', 'tests':117, 'passed':117, 'failed':0, 'skipped':0},
            'githubMerges':{'74':'2026-11-15T09:37:47Z', '75':'2026-11-15T09:38:35Z'},
            'counts':{'environmentDatasetGroups':len(datasets),
                      'environmentChannels':sum(len(d['metrics']) for d in datasets),
                      'processedChannelPoints':sum(len(m['points']) for d in datasets for m in d['metrics']),
                      'historicalVitalRecords':len(vitals), 'syntheticCrew':5, 'syntheticHistoricalCheckIns':65},
            'files':files}


def main():
    text = read('people/potest/environmental-graphs/data/series.js')
    datasets = json.loads(text[text.index('=')+1:].strip().rstrip(';'))
    vitals = list(csv.DictReader(read('people/petros_the_space_larper/astronaut-inflight-vitals.csv').splitlines()))
    catalogue = json.loads(read('people/dadis2/meds/catalogue.json'))
    fixture = json.loads(read('people/petros_the_space_larper/demo-data/health.json'))
    manifest = manifest_for(datasets, vitals)
    (HERE/'evidence-manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
    story = [Spacer(1, 6), para('HEALTH MONITORING SOFTWARE  |  MARS TRANSIT', 'CoverSub'), Spacer(1, 13)]
    logo = pinned_image('integration/onboard-app/pages/assets/team-logo.png')
    image = Image(str(logo), width=244, height=244)
    image.hAlign='CENTER'
    story += [image, Spacer(1, 30), para('PULSE Health Monitoring<br/>for Mars Transit', 'CoverTitle'),
              para('Project rationale data methods and system documentation', 'CoverSub'), Spacer(1, 15),
              para('May the Pulse Be With You', 'CoverSub'),
              para('2026 NASA Space Apps Challenge<br/>14 and 15 November 2026', 'CoverSub'),
              Spacer(1, 12), para('PULSE TR 2026 01  |  Version 1.0<br/>15 November 2026', 'CoverSub'),
              para('Application revision b0f968c  |  Team project report', 'CoverSub'),
              NextPageTemplate('body'), PageBreak(), heading('Contents')]
    toc = TableOfContents()
    toc.levelStyles=[styles['TOCEntry']]
    toc.dotsMinLevel=0
    story += [toc, PageBreak()]
    lines=(HERE/'report.md').read_text(encoding='utf-8').splitlines()
    index=0
    inserted_sleep=False
    while index < len(lines):
        line=lines[index].strip()
        if not line or line.startswith('# '):
            index+=1
            continue
        if line.startswith(':::'):
            if line==':::architecture':
                story += [Architecture(), para('Figure 3 One core joins the six services. Each role uses the same server with separate permissions and module stores.', 'Caption')]
            elif line==':::references':
                references(story)
            elif line==':::appendices':
                appendices(story,datasets,vitals,catalogue,fixture,manifest)
            index+=1
            continue
        if line.startswith('## '):
            if line.startswith('## 18 '):
                story.append(PageBreak())
            story.append(heading(line[3:]))
            index+=1
            continue
        if line.startswith('### '):
            story.append(heading(line[4:], 2))
            index+=1
            continue
        if line.startswith('|'):
            rows=[]
            while index<len(lines) and lines[index].strip().startswith('|'):
                row=[x.strip() for x in lines[index].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[-:]+',x) for x in row):
                    rows.append(row)
                index+=1
            widths=None
            if rows[0][0]=='Contributor':
                widths=[CONTENT_W*.15, CONTENT_W*.21, CONTENT_W*.64]
            if rows[0][0]=='Cycle day':
                widths=[CONTENT_W*.14, CONTENT_W*.36, CONTENT_W*.50]
            story.append(make_table(rows, widths))
            continue
        paragraph=[line]
        index+=1
        while index<len(lines) and lines[index].strip() and not lines[index].startswith(('#','|',':::')):
            paragraph.append(lines[index].strip())
            index+=1
        joined=' '.join(paragraph)
        story.append(para(joined))
        if joined.startswith('The interactive body makes symptom'):
            file=pinned_image('people/tommy/overview-designs/typography/exports/overview-six-instruments.jpg')
            with PILImage.open(file) as im:
                ratio=im.height/im.width
            img=Image(str(file),width=CONTENT_W,height=CONTENT_W*ratio)
            story.append(KeepTogether([img,para('Figure 1 Existing repository export of the six-instrument Overview. Thermal colors and display tints are illustrative; physiological values are separate.', 'Caption')]))
        if joined.startswith('For Tomas, 4.6 hours') and not inserted_sleep:
            story.append(KeepTogether([SleepChart(fixture),para('Figure 2 Synthetic fixture and day-42 scenario. The lower sleep boundary illustrates the implemented rule and is not a clinical limit.', 'Caption')]))
            inserted_sleep=True
    ReportDoc(PDF).multiBuild(story)
    # Keep a fully expanded editable source alongside the narrative, data and evidence.
    print(json.dumps({'pdf':str(PDF),'bytes':PDF.stat().st_size,'counts':manifest['counts']},indent=2))


if __name__=='__main__':
    main()
