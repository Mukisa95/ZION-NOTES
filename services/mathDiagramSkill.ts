/**
 * Math Diagrams SVG Skill
 *
 * This module exports a detailed prompt block that instructs AI models to
 * generate mathematically-correct SVG diagrams using computed coordinates
 * (never eyeballed). It is injected into every transcription prompt so that
 * all AI providers follow the same precise rules when they encounter
 * diagrams in an image or document.
 */

export const MATH_DIAGRAM_SKILL = `
═══════════════════════════════════════════════════════════════
MATH DIAGRAM SVG SKILL — ALWAYS FOLLOW THESE RULES FOR DIAGRAMS
═══════════════════════════════════════════════════════════════

When the image contains any mathematical diagram (number lines, sets/Venn diagrams, geometric shapes, angles, bearings, graphs, or any figure), you MUST reproduce it as inline SVG inside the HTML. DO NOT substitute a diagram with a text description.

GENERAL SVG SETUP (apply to every diagram):
- Always use <svg viewBox="0 0 W H" xmlns="http://www.w3.org/2000/svg"> — pick W/H to fit the content.
- stroke-width="2" for main lines/shapes; stroke-width="1" for grids/ticks.
- Labels: font-family="sans-serif" font-size="14" text-anchor="middle".
- SVG y-axis points DOWNWARD. Angles that open upward use NEGATIVE sin (e.g. dy = -L*sin(θ)).
- COMPUTE all coordinates using the formulas below — NEVER estimate or eyeball positions.
- Build order: (1) compute coordinates, (2) axes/construction, (3) main shape, (4) labels.

─────────────────────────────────────────
1. NUMBER LINES
─────────────────────────────────────────
Formula: spacing_px = (line_end_px - line_start_px) / (max_value - min_value)
         tick_x(v) = line_start_px + (v - min_value) * spacing_px

Rules:
- Draw arrowheads on both ends unless the range is strictly bounded.
- Open circle (fill="white" stroke="black") for strict inequalities (<, >).
- Closed dot (fill="black") for inclusive inequalities (≤, ≥).
- Every tick must align EXACTLY with its label's x-coordinate.

Example template (range −5 to 5, spacing = 360/10 = 36px):
<svg viewBox="0 0 400 80" xmlns="http://www.w3.org/2000/svg">
  <line x1="20" y1="40" x2="380" y2="40" stroke="black" stroke-width="2"/>
  <polygon points="380,40 370,35 370,45" fill="black"/>
  <polygon points="20,40 30,35 30,45" fill="black"/>
  <!-- tick at 0: x = 200 + 0*36 = 200 -->
  <line x1="200" y1="34" x2="200" y2="46" stroke="black" stroke-width="2"/>
  <text x="200" y="62" text-anchor="middle" font-size="12">0</text>
  <!-- open circle at −3: x = 200 − 3*36 = 92 -->
  <circle cx="92" cy="40" r="5" fill="white" stroke="black" stroke-width="2"/>
  <!-- closed dot at 2: x = 200 + 2*36 = 272 -->
  <circle cx="272" cy="40" r="5" fill="black"/>
</svg>

─────────────────────────────────────────
2. SETS / VENN DIAGRAMS
─────────────────────────────────────────
- Draw a universal-set rectangle, label it "ξ" top-left.
- Two-set Venn: two circles, radius r=80, centers 80px apart horizontally for clear overlap.
- Three-set Venn: three circles, radius 80, centers at roughly (150,110), (210,110), (180,170).
- Logically determine which region each element belongs to (left-only, right-only, intersection, outside), THEN place its text in that region.
- Intersection region x ≈ midpoint of the two centers.

Example (two sets A and B):
<svg viewBox="0 0 360 260" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="340" height="240" fill="none" stroke="black" stroke-width="2"/>
  <text x="25" y="30" font-size="16">ξ</text>
  <circle cx="140" cy="140" r="80" fill="none" stroke="black" stroke-width="2"/>
  <circle cx="220" cy="140" r="80" fill="none" stroke="black" stroke-width="2"/>
  <text x="100" y="70" font-size="16">A</text>
  <text x="260" y="70" font-size="16">B</text>
  <!-- place actual element labels in correct regions -->
</svg>

─────────────────────────────────────────
3. GEOMETRY (triangles, polygons)
─────────────────────────────────────────
NEVER freehand proportions. Compute vertex coordinates from given measurements.

SAS (two sides + included angle θ):
  A = (0, 0)
  B = (b, 0)
  C = (c * cos(θ_rad), −c * sin(θ_rad))   ← negative sin to flip for SVG y-axis

SSS (three sides a, b, c — place AB on x-axis):
  A = (0, 0), B = (c, 0)
  angle_A = arccos((b² + c² − a²) / (2·b·c))
  C = (b · cos(angle_A), −b · sin(angle_A))

Scale all coordinates by pixels_per_unit and add offset so diagram fits viewBox.
- Label vertices OUTSIDE the polygon, near each vertex.
- Label side lengths near the midpoint of each side, slightly offset outward.
- Show right angles with a small square symbol (two short perpendicular lines), not an arc.
- Make sides proportional — a 10 cm side must be visually about twice a 5 cm side.

─────────────────────────────────────────
4. ANGLES
─────────────────────────────────────────
Place vertex at a fixed point (e.g. 150, 200).
Ray 1: endpoint = (150 + L, 200)  [horizontal]
Ray 2: endpoint = (150 + L·cos(θ_rad), 200 − L·sin(θ_rad))  [negative sin = opens upward]

Arc between the rays (radius r from vertex, for angles < 180° use large-arc-flag=0):
  Arc start = (vx + r·cos(ray1_angle), vy − r·sin(ray1_angle))
  Arc end   = (vx + r·cos(ray2_angle), vy − r·sin(ray2_angle))
  sweep-flag: try 0 first, flip to 1 if arc appears on wrong side.

Place angle label inside the arc, away from ray intersections.
Use a small square for 90° angles, not an arc.

─────────────────────────────────────────
5. BEARINGS
─────────────────────────────────────────
Bearings are clockwise from North. To place a point at bearing B° and distance d from (x0, y0):
  dx =  d · sin(B_rad)
  dy = −d · cos(B_rad)   ← negative because North = up = negative SVG y
  destination = (x0 + dx, y0 + dy)

Rules:
- Draw a dashed vertical North arrow at every origin point: line from (x0, y0) up to (x0, y0−70), with an arrowhead, labeled "N".
- Draw the bearing arc CLOCKWISE from the North line to the bearing line.
- Label bearings as 3 digits: "060°" not "60°".
- If multiple bearings appear, draw a North arrow at every relevant point.

─────────────────────────────────────────
6. COORDINATE AXES / GRAPHS
─────────────────────────────────────────
- Draw x and y axes with arrowheads, label them.
- Plot point (px, py) in data space at SVG position:
    svgX = origin_x + px · pixels_per_unit
    svgY = origin_y − py · pixels_per_unit   ← subtract for y (SVG is flipped)
- Straight-line graphs: compute two points from the equation and draw a <line>.
- Curves: sample every 0.25–0.5 units and connect with <path L ...> commands.
- Mark grid lines lightly: stroke="#ccc" stroke-width="1".

─────────────────────────────────────────
FINAL CHECK (do this before every SVG):
─────────────────────────────────────────
1. Every value, label, and region matches the original image/question exactly.
2. Relative sizes look proportionally correct (30° is narrower than 90°, etc.).
3. No text overlaps lines or other text.
4. The entire drawing is within the viewBox with a small margin on all sides.
═══════════════════════════════════════════════════════════════
`;
